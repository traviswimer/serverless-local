'use strict';

const Promise = require('bluebird');
const deepmerge = require('deepmerge');

const ResourceManager = require('./ResourceManager');
const services_mapping = require('./services_mapping');

const DEFAULT_CONFIG = {
	host: 'http://localhost',
	region: 'local',
	ports: {
		"dynamodb": 4569,
		"ses": 4579,
		"kinesis": 4568,
		"redshift": 4577,
		"s3": 4572,
		"cloudwatch": 4582,
		"cloudformation": 4581,
		"ssm": 4583,
		"sqs": 4576,
		"sns": 4575,
		"dynamodbstreams": 4570,
		"firehose": 4573,
		"route53": 4580,
		"es": 4578,
		//"apigateway": 4567,
		//"lambda": 4574
	},
	endpoints: {}
}

class ServerlessLocalPlugin {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;

		this.service = serverless.service;

		this.resources = this.service.resources && this.service.resources.Resources || {};

		this.cli_log = this.cli_log.bind(this);

		this.generateConfig();

		// Setup AWS SDK
		this.awsProvider = this.serverless.getProvider('aws');
		this.awsProvider.sdk.config.update({region: this.config.region, endpoint: this.config.host});
		this.awsProvider.sdk.config.setPromisesDependency(require('bluebird'));

		this.commands = {
			local: {
				usage: 'Initializes localstack services',
				lifecycleEvents: [
					'ports', 'resources'
				],
				commands: {
					ports: {
						usage: 'Updates AWS sdk to use localstack ports',
						lifecycleEvents: ['init']
					},
					resources: {
						usage: 'Initializes localstack resources',
						lifecycleEvents: ['init']
					}
				}
			}
		};

		this.hooks = {
			'before:offline:start:init': () => this.serverless.pluginManager.spawn('local'),

			'local:ports': this.portsHandler.bind(this),
			'local:resources': this.resourcesHandler.bind(this)
		};
	}

	cli_log(message) {
		this.serverless.cli.log(`LOCAL: ${message}`);
	}

	generateConfig() {
		// Merge default and user-provided config options
		let custom_config = this.service.custom && this.service.custom['serverless-local'] || {};
		this.config = deepmerge(DEFAULT_CONFIG, custom_config);

		// Generate endpoints if a custom one was not provided
		let merged_endpoints = {};
		Object.keys(DEFAULT_CONFIG.ports).forEach((service_name) => {
			merged_endpoints[service_name] = {};
			merged_endpoints[service_name].endpoint = this.config.endpoints[service_name] || `${this.config.host}:${this.config.ports[service_name]}`
		})
		this.config.endpoints = merged_endpoints;
		delete this.config.ports; // the "ports" may now be out of sync, so its deleted to avoid accidentally using it.
	}

	portsHandler() {
		this.cli_log('-- START: local:ports --');
		this.cli_log(Object.keys(this.config.endpoints).map((service) => `\r\n + ${this.config.endpoints[service].endpoint} -- ${service}`));
		this.awsProvider.sdk.config.update(this.config.endpoints);
		this.resource_manager = new ResourceManager(this.awsProvider.sdk, {log_fn: this.cli_log});
		process.env.LOCAL_AWS_ENDPOINTS = JSON.stringify(this.config.endpoints);
		this.cli_log('-- END: local:ports --');
	}

	resourcesHandler() {
		this.cli_log('-- START: local:resources --');
		return this.resource_manager.createResources(this.resources).then(() => {
			this.cli_log('-- END: local:resources --');
		});
	}
}

module.exports = ServerlessLocalPlugin;

'use strict';

const Promise = require('bluebird');
const deepmerge = require('deepmerge');

const SUPPORTED_SERVICES = {
	'AWS::DynamoDB::Table': require('./services/DynamoDbTable'),
	//'AWS::Elasticsearch::Domain': require('./services/ElasticsearchDomain')
};

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

		this.generateConfig();

		// Setup AWS SDK
		this.awsProvider = this.serverless.getProvider('aws');
		this.awsProvider.sdk.config.update({region: this.config.region, endpoint: this.config.host});
		this.awsProvider.sdk.config.setPromisesDependency(require('bluebird'));

		this.commands = {
			local: {
				usage: 'Initializes localstack services',
				lifecycleEvents: [
					'ports',
					'resources'
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
			'before:offline:start:init': () => this.serverless.pluginManager.run(['local']),
			'local': () => this.serverless.pluginManager.run(['local', 'ports']),
			'local:ports': this.portsHandler.bind(this),
			'local:resources': this.resourcesHandler.bind(this)

		};
	}

	cli_log(message){
		this.serverless.cli.log(`INITIALIZE: ${message}`);
	}

	generateConfig() {
		// Merge default and user-provided config options
		let custom_config = this.service.custom && this.service.custom['serverless-local'] || {};
		this.config = deepmerge(DEFAULT_CONFIG, custom_config);

		// Generate endpoints if a custom one was not provided
		let merged_endpoints = {};
		Object.keys(DEFAULT_CONFIG.ports).forEach((service_name) => {
			merged_endpoints[service_name] = {};
			merged_endpoints[service_name].endpoint = merged_config.endpoints[service_name] || `${merged_config.host}:${merged_config.ports[service_name]}`
		})
		this.config.endpoints = merged_endpoints;
	}

	portsHandler() {
		this.cli_log('Updating AWS endpoints:');
		this.cli_log(JSON.stringify(this.endpoints));
		this.awsProvider.sdk.config.update(this.endpoints);
	}

	resourcesHandler() {
		this.cli_log('Creating resources:');
		let resources_promises = Object.keys(this.resources).map((resource_key) => {
			let resource = this.resources[resource_key];
			if (SUPPORTED_SERVICES[resource.Type]) {
				let service = new SUPPORTED_SERVICES[resource.Type](this.awsProvider.sdk);
				return service.createResource(resource.Properties).then(()=>{
					this.cli_log(`DynamoDB table "${resource.Properties.TableName}" created.`);
				}).catch((err) => {
					if(err.name === 'ResourceInUseException'){
						this.cli_log(`DynamoDB table "${resource.Properties.TableName}" already exists. Skipping...`);
					}
				});
			} else {
				return Promise.resolve();
			}
		});
		return Promise.all(resources_promises);
	}
}

module.exports = ServerlessLocalPlugin;

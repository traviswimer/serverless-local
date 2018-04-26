'use strict';

const Promise = require('bluebird');
const deepmerge = require('deepmerge');

const SUPPORTED_SERVICES = {
	'AWS::DynamoDB::Table': require('./services/DynamoDbTable'),
};

const DEFAULT_CONFIG = {
	host: 'http://localhost',
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

class ServerlessLocalstackInitialize {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;

		this.service = serverless.service;

		this.resources = this.service.resources && this.service.resources.Resources || {};

		this.generateEndpoints();

		this.awsProvider = this.serverless.getProvider('aws');
		this.awsProvider.sdk.config.update({region: 'local', endpoint: 'http://localhost'});
		this.awsProvider.sdk.config.setPromisesDependency(require('bluebird'));

		this.commands = {
			initialize: {
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
			'before:offline:start:init': () => this.serverless.pluginManager.run(['initialize']),
			'initialize': () => this.serverless.pluginManager.run(['initialize', 'ports']),
			'initialize:ports': this.portsHandler.bind(this),
			'initialize:resources': this.resourcesHandler.bind(this)

		};
	}

	cli_log(message){
		this.serverless.cli.log(`INITIALIZE: ${message}`);
	}

	generateEndpoints() {
		let custom_config = this.service.custom && this.service.custom['serverless-localstack-initialize'] || {};
		let merged_config = deepmerge(DEFAULT_CONFIG, custom_config);
		this.endpoints = {};
		Object.keys(DEFAULT_CONFIG.ports).forEach((service_name) => {
			this.endpoints[service_name] = {};
			this.endpoints[service_name].endpoint = merged_config.endpoints[service_name] || `${merged_config.host}:${merged_config.ports[service_name]}`
		})
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

module.exports = ServerlessLocalstackInitialize;

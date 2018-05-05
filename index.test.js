const Serverless = require('serverless');
const Promise = require('bluebird');

const ServerlessLocalPlugin = require('./index');

jest.mock('./ResourceManager');
const ResourceManager = require('./ResourceManager');

var serverless;
describe('ServerlessLocalPlugin', () => {
	beforeEach(() => {
		serverless = {
			cli: {
				log: jest.fn(),
				consoleLog: jest.fn()
			},
			pluginManager: {
				spawnzz: jest.fn()
			},
			service: {
				resources: {}
			},
			getProvider: jest.fn(() => {
				return {
					sdk: {
						config: {
							update: jest.fn(),
							setPromisesDependency: jest.fn()
						}
					}
				}
			})
		}
	});

	describe('constructor()', () => {
		test('default config is used if no user config provided', () => {
			let plugin = new ServerlessLocalPlugin(serverless);
			expect(plugin.config).toMatchSnapshot();
		});

		test('user config will override default', () => {
			serverless.service.custom = {
				'serverless-local': {
					host: 'http://otherhost',
					region: 'elsewhere',
					ports: {
						"dynamodb": 1111,
						"redshift": 2222,
						"cloudformation": 3333,
						"sqs": 4444
					},
					endpoints: {
						dynamodbstreams: 'https://randomhost:1234',
						route53: 'http://randomhost:4321'
					}
				}
			}
			let plugin = new ServerlessLocalPlugin(serverless);
			expect(plugin.config).toMatchSnapshot();
		});
	});

	describe('portsHandler()', () => {
		test('updates AWS SDK with config endpoints', () => {
			let plugin = new ServerlessLocalPlugin(serverless);
			plugin.portsHandler();
			expect(plugin.awsProvider.sdk.config.update.mock.calls[1][0]).toMatchSnapshot();
		});
	});

	describe('resourcesHandler()', () => {
		test('creates each resource with the provided properties', () => {
			let plugin = new ServerlessLocalPlugin(serverless);
			plugin.resources = {
				resource1: {
					Type: 'type1',
					Properties: {
						resource1_prop1: 'prop1'
					}
				},
				resource2: {
					Type: 'type2',
					Properties: {
						resource2_prop1: 'prop1'
					}
				},
				resource3: {
					Type: 'type1',
					Properties: {
						resource3_prop1: 'prop1'
					}
				}
			}
			plugin.resource_manager = new ResourceManager();
			return plugin.resourcesHandler().then(() => {
				Object.keys(plugin.resources).forEach((resource, index) => {
					expect(plugin.resource_manager.createResource.mock.calls[index][0]).toEqual({resource_name: resource, resource: plugin.resources[resource]});
				});
			});
		});
	});
});

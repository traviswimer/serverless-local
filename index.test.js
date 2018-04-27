const Serverless = require('serverless');
const Promise = require('bluebird');

const ServerlessLocalPlugin = require('./index');

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
						"sqs": 4444,
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
});

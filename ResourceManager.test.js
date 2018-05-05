const Serverless = require('serverless');
const Promise = require('bluebird');

const ResourceManager = require('./ResourceManager');

jest.mock('./services_mapping');

var resource_manager;
describe('ResourceManager', () => {
	describe('createResource()', () => {
		test('calls the service\'s create method with the resource properties', () => {
			let createServiceType1 = jest.fn(()=>{
				return {
					promise(){
						return Promise.resolve();
					}
				}
			});
			let mock_sdk = {
				ServiceType1: class ServiceType1 {
					constructor() {
						this.createServiceType1 = createServiceType1;
					}
				}
			}
			resource_manager = new ResourceManager(mock_sdk);
			return resource_manager.createResource({
				resource_name: 'serviceType1',
				resource: {
					Type: 'service_type1',
					Properties: {
						serviceType1_prop1: 'serviceType1_prop1',
						serviceType1_prop2: {
								serviceType1_prop2a: 'serviceType1_prop2a'
						},
						serviceType1_prop3: 'serviceType1_prop3'
					}
				}
			}).then(() => {
				expect(createServiceType1.mock.calls[0]).toMatchSnapshot();
			});
		});
	});
});

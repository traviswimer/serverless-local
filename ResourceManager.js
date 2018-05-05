const Promise = require('bluebird');
const deepmerge = require('deepmerge');
const services_mapping = require('./services_mapping');

class ResourceManager {
	constructor(AWS) {
		this.AWS = AWS;
	}

	createResource({resource_name, resource}) {
		let service_data = services_mapping[resource.Type];
		if (service_data) {
			let resource_instance = new this.AWS[service_data.sdk_class]();

			// Override resource properties
			let default_override_properties = typeof service_data.override_properties === 'function' ? service_data.override_properties(resource.Properties) : service_data.override_properties;
			let resource_properties = deepmerge(resource.Properties, default_override_properties || {});

			// Create the resource
			return resource_instance[service_data.createMethod](resource_properties).promise().then((resource_info) => {
				return `${service_data.sdk_class} -- "${resource_name}" created.`;
			}).catch((error) => {
				if (error.name === service_data.already_exists_error) {
					return `${service_data.sdk_class} -- "${resource_name}" already exists. Skipping...`;
				} else {
					throw error;
				}
			});
		}else{
			// Just ignore any resource types that don't have a mapping
			return Promise.resolve();
		}
	}
}

module.exports = ResourceManager;

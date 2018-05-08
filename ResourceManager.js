const Promise = require('bluebird');
const deepmerge = require('deepmerge');
const traverse = require('traverse');

const services_mapping = require('./services_mapping');

class ResourceManager {
	constructor(AWS, {log_fn}) {
		this.AWS = AWS;
		this.log = log_fn;
		this.resources_info = {};
		this.wait_list = {};
		this.iterations = 0;
	}

	createResource({resource_name, resource}) {
		let service_data = services_mapping[resource.Type];
		if (service_data) {
			let constructor_props = service_data.constructor_props || {};
			let resource_instance = new this.AWS[service_data.sdk_class]({
				...constructor_props
			});

			// Override resource properties
			let resource_properties = typeof service_data.override_properties === 'function'
				? service_data.override_properties(JSON.parse(JSON.stringify(resource.Properties)))
				: deepmerge(resource.Properties, service_data.override_properties || {});

			// Create the resource
			return resource_instance[service_data.createMethod](resource_properties).promise().then((resource_info) => {
				var info;
				if (service_data.process_resource_info) {
					info = service_data.process_resource_info(resource_info, resource_properties);
				} else {
					// Most services seem to return an object with a single property.
					// This property contains the relevant info, so it is pulled out here.
					let first_property = Object.keys(resource_info)[0];
					info = resource_info[first_property] || {};
				}
				info.AWS_TYPE = resource.Type;

				this.resources_info[resource_name] = info;
				return `${service_data.sdk_class} -- "${resource_name}" created.`;
			}).catch((error) => {
				if (error.name === service_data.already_exists_error) {
					return `${service_data.sdk_class} -- "${resource_name}" already exists. Skipping...`;
				} else {
					throw error;
				}
			});
		} else {
			// Just ignore any resource types that don't have a mapping
			return Promise.resolve(`${resource_name} -- '${resource.Type}' not supported. Skipping...`);
		}
	}

	createResources(resources) {
		this.wait_list = {};
		let resources_promises = Object.keys(resources).map((resource_key) => {
			let resource = resources[resource_key];
			var is_waitlisted = false;
			var self = this;

			// Mimic the functionality of cloudformation's "Fn::GetAtt".
			traverse(resource).forEach(function(value) {
				if (this.key === 'Fn::GetAtt') {
					let ref_resource_name = value[0];
					let ref_resource_info = self.resources_info[ref_resource_name];
					let ref_resource_property = value[1] !== 'Arn'
						? value[1]
						: (services_mapping[ref_resource_info && ref_resource_info.AWS_TYPE] || {}).arn_prop || 'Arn';

					if (ref_resource_info && ref_resource_info[ref_resource_property]) {
						this.parent.update(ref_resource_info[ref_resource_property]);
					} else {
						is_waitlisted = true;
						self.wait_list[resource_key] = resource;
					}
				} else if (this.key === 'RoleARN') {
					// Localstack doesn't support IAM, so this just add a string as the ARN.
					this.update('MockRoleArn');
				}
			});

			// Either create the record or try again later if certain "Fn:GetAtt"
			// variables could not be found.
			if (!is_waitlisted) {
				return this.createResource({resource_name: resource_key, resource: resource}).then((message) => {
					this.log(message);
				}).catch((err) => {
					this.log(err.stack);
				});
			} else {
				return Promise.resolve();
			}
		});

		return Promise.all(resources_promises).then(() => {
			if (Object.keys(this.wait_list).length > 0 && this.iterations < 30) {
				this.iterations++;
				return this.createResources(this.wait_list);
			}
		});
	}
}

module.exports = ResourceManager;

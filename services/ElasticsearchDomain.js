'use strict';

class ElasticsearchDomain {
	constructor(AWS) {
		this.es = new AWS.ES({apiVersion: '2015-01-01'});
		this.createResource = this.createResource.bind(this);
	}

	createResource(resource_properties) {
		resource_properties.AccessPolicies = resource_properties.AccessPolicies
			? JSON.stringify(resource_properties.AccessPolicies)
			: undefined;
		resource_properties.ElasticsearchVersion = resource_properties.ElasticsearchVersion.toString();
		return this.es.createElasticsearchDomain(resource_properties).promise().then(() => {
			return `ES Domain "${resource_properties.DomainName}" created.`;
		}).catch((error) => {
			if (error.name === 'ResourceAlreadyExistsException') {
				return `ES Domain "${resource_properties.DomainName}" already exists. Skipping...`;
			} else {
				throw error;
			}
		});
	}
}

module.exports = ElasticsearchDomain;

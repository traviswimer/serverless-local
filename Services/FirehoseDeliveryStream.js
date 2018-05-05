'use strict';

class FirehoseDeliveryStream {
	constructor(AWS) {
		this.firehose = new AWS.Firehose({apiVersion: '2015-08-04'});
		this.createResource = this.createResource.bind(this);
	}

	createResource(resource_properties) {
		return this.firehose.createDeliveryStream(resource_properties).promise().then(() => {
			return `Firehose DeliveryStream "${resource_properties.DeliveryStreamName}" created.`;
		}).catch((error) => {
			console.log(resource_properties.ElasticsearchDestinationConfiguration.DomainARN);
			if (error.name === 'ResourceAlreadyExistsException') {
				return `Firehose DeliveryStream "${resource_properties.DeliveryStreamName}" already exists. Skipping...`;
			} else {
				throw error;
			}
		});
	}
}

module.exports = FirehoseDeliveryStream;

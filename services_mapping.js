module.exports = {
	'AWS::DynamoDB::Table': {
		sdk_class: 'DynamoDB',
		createMethod: 'createTable',
		already_exists_error: 'ResourceInUseException',
		override_properties: (properties) => {
			return {
				// "StreamEnabled" is required for localstack, but does not exists on AWS
				StreamSpecification: properties.StreamSpecification && {
					StreamEnabled : !!properties.StreamSpecification.StreamViewType
				}
			}
		}
	},
	'AWS::Elasticsearch::Domain': {
		sdk_class: 'ES',
		createMethod: 'createElasticsearchDomain',
		already_exists_error: 'ResourceAlreadyExistsException',
		resource_attr_prop: 'DomainStatus',
		override_properties: (properties) => {
			return {
				// Need to convert this object to a JSON string
				AccessPolicies: properties.AccessPolicies
					? JSON.stringify(properties.AccessPolicies)
					: undefined,
				// Version may be a number, but the AWS sdk requires a string
				ElasticsearchVersion: properties.ElasticsearchVersion.toString()
			}
		}
	},
	'AWS::KinesisFirehose::DeliveryStream': {
		sdk_class: 'Firehose',
		createMethod: 'createDeliveryStream',
		already_exists_error: 'ResourceAlreadyExistsException',
		override_properties: {}
	}
}

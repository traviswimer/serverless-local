module.exports = {
	'AWS::DynamoDB::Table': {
		sdk_class: 'DynamoDB',
		createMethod: 'createTable',
		arn_prop: 'TableArn',
		already_exists_error: 'ResourceInUseException',
		override_properties: (properties) => {
			// "StreamEnabled" is required for localstack, but does not exists on AWS
			if (properties.StreamSpecification) {
				properties.StreamSpecification = {
					StreamEnabled: !!properties.StreamSpecification.StreamViewType
				}
			}
			return properties;
		}
	},
	'AWS::SES::ConfigurationSet': {
		sdk_class: 'SES',
		createMethod: 'createConfigurationSet'
	},
	'AWS::S3::Bucket': {
		sdk_class: 'S3',
		constructor_props: {
			s3ForcePathStyle: true
		},
		createMethod: 'createBucket',
		already_exists_error: 'BucketAlreadyExists',
		override_properties: (properties) => {
			// the SDK uses "Bucket" instead of "BucketName"
			properties.Bucket = properties.BucketName;
			delete properties.BucketName;
			return properties;
		}
	},
	'AWS::Elasticsearch::Domain': {
		sdk_class: 'ES',
		createMethod: 'createElasticsearchDomain',
		already_exists_error: 'ResourceAlreadyExistsException',
		arn_prop: 'ARN',
		override_properties: (properties) => {
			// Need to convert this object to a JSON string
			properties.AccessPolicies = properties.AccessPolicies
				? JSON.stringify(properties.AccessPolicies)
				: undefined;
			// Version may be a number, but the AWS sdk requires a string
			properties.ElasticsearchVersion = properties.ElasticsearchVersion.toString();
			return properties;
		}
	},
	'AWS::KinesisFirehose::DeliveryStream': {
		sdk_class: 'Firehose',
		createMethod: 'createDeliveryStream',
		already_exists_error: 'ResourceAlreadyExistsException',
		override_properties: {}
	}
}

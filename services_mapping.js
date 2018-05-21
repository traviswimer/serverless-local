const path = require('path');
const Promise = require('bluebird');

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
		},
		initialize: (aws_sdk, resource_props, resource_options) => {
			// Populate db with documents
			if (resource_options.documents_path) {
				let db = new aws_sdk.DynamoDB.DocumentClient();
				let absolute_docs_path = path.join(process.cwd(), resource_options.documents_path);
				let docs = require(absolute_docs_path);
				let documents_promises = docs.map((doc) => {
					return db.put({TableName: resource_props.Properties.TableName, Item: doc}).promise();
				});

				return Promise.all(documents_promises);
			}
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
		process_resource_info: (creation_response, resource_input) => {
			let first_property = Object.keys(creation_response)[0];
			creation_response = creation_response[first_property] || {};

			// ARN isn't provided by the response for buckets
			creation_response.Arn = `arn:aws:s3:::${resource_input.Bucket}`;
			return creation_response;
		},
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
		process_resource_info: (creation_response, resource_input) => {
			// Unlike most services, Firehose doesn't nest data inside an
			// object property, so just return the data as is.
			return creation_response;
		},
		override_properties: {}
	}
}

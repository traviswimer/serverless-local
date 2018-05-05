const DynamoDbTable = require('./DynamoDbTable');
const ElasticsearchDomain = require('./ElasticsearchDomain');
const FirehoseDeliveryStream = require('./FirehoseDeliveryStream');

class Services {
	constructor(AWS){
		this['AWS::DynamoDB::Table'] = new DynamoDbTable(AWS);
		this['AWS::Elasticsearch::Domain'] = new ElasticsearchDomain(AWS);
		this['AWS::KinesisFirehose::DeliveryStream'] = new FirehoseDeliveryStream(AWS);
	}
}

module.exports = Services;

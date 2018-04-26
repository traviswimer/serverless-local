const DynamoDbTable = require('./DynamoDbTable');
const ElasticsearchDomain = require('./ElasticsearchDomain');

class Services {
	constructor(AWS){
		this['AWS::DynamoDB::Table'] = new DynamoDbTable(AWS);
		//this['AWS::Elasticsearch::Domain'] = new ElasticsearchDomain(AWS);
	}
}

module.exports = Services;

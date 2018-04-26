class DynamoDbTable {
	constructor(AWS) {
		this.db = new AWS.DynamoDB({apiVersion: '2012-08-10'});
		this.createResource = this.createResource.bind(this);
	}

	createResource(resource_properties) {
		// "StreamEnabled" is required for localstack, but does not exists on AWS
		if (resource_properties.StreamSpecification && resource_properties.StreamSpecification.StreamViewType) {
			resource_properties.StreamSpecification.StreamEnabled = true;
		}
		return this.db.createTable(resource_properties).promise().then(()=>{
			return `DynamoDB table "${resource_properties.TableName}" created.`;
		}).catch((error)=>{
			if(error.name === 'ResourceInUseException'){
				return `DynamoDB table "${resource_properties.TableName}" already exists. Skipping...`;
			}else{
				throw error;
			}
		});
	}

	populate(data) {}
}

module.exports = DynamoDbTable;

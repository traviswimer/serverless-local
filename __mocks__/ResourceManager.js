const Promise = require('bluebird');

module.exports = class ResourceManagerMock {
	constructor() {
		this.createResource = jest.fn(()=>Promise.resolve());
	}
}

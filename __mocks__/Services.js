module.exports = class ServicesMock{
	constructor(){
		this.type1 = {
			createResource: jest.fn()
		};
		this.type2 = {
			createResource: jest.fn()
		};
	}
}

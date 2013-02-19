var fs = require('fs')
  , Validator = require('../lib/validator').Validator
  , Validator2 = require('../lib/validator2').Validator;

/**
 * Retrieve the server information for the current
 * instance of the db client
 *
 * @ignore
 */
exports.setUp = function(callback) {
  callback();
}

/**
 * Retrieve the server information for the current
 * instance of the db client
 *
 * @ignore
 */
exports.tearDown = function(callback) {
  callback();
}

var testFunc = function(param1) {
  return "called" + param1;  
}

exports.shouldCorrectlyTestFunctionValidationAgainstNotNull = function(test) {
  var func = Validator2
    .notnull('param1')
    .failOnFirstError(true)
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  // Call function Normal
  test.equal("called1",  func(1));
  test.equal(1, func(null).length);
  test.done();
}

exports.shouldCorrectlyTestStringValidations = function(test) {
  // NOTNULL and typeof String
  var func = Validator2
    .string('param1')
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  // Call function
  test.equal("called1",  func("1"));
  test.equal(1, func(1).length);
  test.equal("param1 is not a string", func(1)[0].err.message);
  test.equal(1, func(null).length);
  test.equal("param1 is null", func(null)[0].err.message);

  // IN
  // Set up string validation for in
  var func = Validator2
    .string('param1', {in: ["open", "close", "store"]})
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  test.equal("param1 'tes' not found in [ 'open', 'close', 'store' ]", func("tes")[0].err.message);
  test.equal("calledstore", func("store"));

  // LT/GT
  // Set up string validation for in
  var func = Validator2
    .string('param1', {lt: 10, gt: 5})
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  test.equal("param1 value of '' is shorter than 5 characters", func("")[0].err.message);
  test.equal("called11111", func("11111"));
  test.equal("param1 value of '12345678911' is longer than 10 characters", func("12345678911")[0].err.message);

  // REGEXP
  // Set up string validation for in
  var func = Validator2
    .string('param1', {regexp: /^mine/})
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  // Call function
  test.equal(1, func("1").length);
  test.equal("param1 value of \'1\' did not match regexp /^mine/", func("1")[0].err.message);
  test.equal("calledmine", func("mine"));
  test.equal("param1 is not a string", func(1)[0].err.message);
  test.equal("param1 is null", func(null)[0].err.message);
  test.done();
}

exports.shouldCorrectlyValidateAgainstNumbers = function(test) {
  // Simple no number test
  var func = Validator2
    .number('param1')
    .interpreted(this, function(param1) {
      return "called" + param1;
    });


  // Call function
  test.equal("param1 is null", func(null)[0].err.message);
  test.equal("param1 is not a number", func("hello")[0].err.message);

  // Simple number range check, lt and gt
  var func = Validator2
    .number('param1', {gt:5, lt:1000})
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  test.equal("param1 is null", func(null)[0].err.message);
  test.equal("param1 value of 2000 is greater than 1000", func(2000)[0].err.message);
  test.equal("param1 value of 1 is less than 5", func(1)[0].err.message);
  test.equal("called7", func(7));

  // Simple number range check, lte and gte
  var func = Validator2
    .number('param1', {gte:5, lte:1000})
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  test.equal("param1 is null", func(null)[0].err.message);
  test.equal("param1 value of 2000 is greater than 1000", func(2000)[0].err.message);
  test.equal("param1 value of 1 is less than 5", func(1)[0].err.message);
  test.equal("called7", func(7));

  // Simple number range check, in an array of values
  var func = Validator2
    .number('param1', {in:[1, 2, 3]})
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  test.equal("param1 is null", func(null)[0].err.message);
  test.equal("param1 value of 8 not found in [ 1, 2, 3 ]", func(8)[0].err.message);
  test.equal("called1", func(1));
  test.done();
}

exports.shouldCorrectlyHandleObjectValidations = function(test) {
  // Simple object validator, uses the same rules as above
  var func = Validator2
    .object('param1', function() {
      this.number('age', { lt: 100, gt:5 });
      this.string('email', {in: ["user@user.com"]});
      this.string('address.street', {regexp: /^us/});
    })
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  test.equal("age value of 120 is greater than 100", func({age:120, name:'test', email:"test@in.com", address:{street:"aus road"}})[0].err.message);
  test.equal("email 'test@in.com' not found in [ 'user@user.com' ]", func({age:120, name:'test', email:"test@in.com", address:{street:"aus road"}})[1].err.message);
  test.equal("address.street value of 'aus road' did not match regexp /^us/", func({age:120, name:'test', email:"test@in.com", address:{street:"aus road"}})[2].err.message);
  test.done();
}

exports.shouldCorrectlyHandleNestedObjectValidations = function(test) {
  var func = Validator2
    .object('param1', function() {
      this.number('age', { lt: 100, gt:5 });
      this.string('email', {in: ["user@user.com"]});
      this.string('address.street', {regexp: /^us/});
      
      this.object('price', function() {
        this.string('currency', {in:['USD', 'EUR']});
        this.number('amount', {gt:0});
      });
      
      this.object('location', function() {        
        this.object('city', function() {
          this.string('street', {in:['NYC', 'SF']});          
        })
      });
    })
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  var results = func({price:{currency:'NOK', amount:-1}, location: {city: {}}});
  test.equal(6, results.length);
  test.equal("no object member age", results[0].err.message);
  test.equal("no object member email", results[1].err.message);
  test.equal("no object member address.street", results[2].err.message);
  test.equal("price.currency 'NOK' not found in [ 'USD', 'EUR' ]", results[3].err.message);
  test.equal("no object member location.city.street", results[5].err.message);
  test.equal("price.amount value of -1 is less than 0", results[4].err.message);
  test.done();
}

exports.shouldCorrectlyPerformCustomValidation = function(test) {
  // Custom email validator function, returns an array of Error objects
  var customerEmailValidator = function(name, value) {
    var errors = [];
    if(value == null) errors.push(new Error("value should not be null"));
    if(typeof value != 'string') errors.push(new Error("value must be a string"));
    if(value && typeof value == 'string' && value.indexOf("gmail") -1) errors.push(new Error("only emails from gmail allowed"));
    return errors;
  }

  // Simple object validator, uses the same rules as above
  var func = Validator2
    .object('param1', function() {
      this.function('email', customerEmailValidator);
    })
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  var results = func({email:'dome@dome.com'});
  test.equal(1, results.length);
  test.equal("only emails from gmail allowed", results[0].err.message);
  test.equal("function", results[0].validation.type);
  test.equal("dome@dome.com", results[0].value);

  // Simple object validator, uses the same rules as above
  var func = Validator2
    .object('param1', function() {
      this.object('person', function() {
        this.function('email', customerEmailValidator);
      })
    })
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  var results = func({person:{email:'dome@dome.com'}});
  test.equal(1, results.length);
  test.equal("only emails from gmail allowed", results[0].err.message);
  test.equal("person.email", results[0].name);
  test.done();
}

exports.shouldCorrectlyFailOnFirstError = function(test) {
  // Simple object validator, uses the same rules as above
  var func = Validator2
    .object('param1', function() {
      this.string('name');
      this.string('email');
      this.string('address.street')
      
      this.object('price', function() {
        this.string('currency', {in:['USD', 'EUR']});
        this.number('amount', {gt: 0});
      })
    })
    .failOnFirstError(true)
    .interpreted(this, function(param1) {
      return "called" + param1;
    });

  var results = func({price:{currency:'NOK', amount:-1}});
  test.equal(1, results.length);
  test.equal("no object member name", results[0].err.message);
  test.done();
}









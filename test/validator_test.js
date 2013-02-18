var fs = require('fs'),
  Validator = require('../../lib/web/validation/validator').Validator;

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

exports.shouldCorrectlyTestFunctionValidationAgainstNotNull = function(test) {
  var funcPrototype = Validator([
    {type:'notnull', position: 0, name:'param1'}
  ], this, function(param1) {
    return "called" + param1;
  });

  // Normal and compiled function
  var func = funcPrototype.func();
  var funcCompiled = funcPrototype.compile();

  // Call function Normal
  test.equal("called1",  func(1));
  test.equal(1, func(null).length);

  // Call function Compiled
  test.equal("called1",  funcCompiled(1));
  test.equal(1, funcCompiled(null).length);
  test.done();
}

exports.shouldCorrectlyTestFunctionValidationAgainstNotNullAndNoString = function(test) {
  var funcPrototype = Validator([
    {type:'string', position: 0, name:'param1'}
  ], this, function(param1) {
    return "called" + param1;
  });

  // Normal and compiled function
  var func = funcPrototype.func();
  var funcCompiled = funcPrototype.compile();

  // Call function
  test.equal("called1",  func("1"));
  test.equal(1, func(1).length);
  test.equal("param1 is not a string", func(1)[0].err.message);
  test.equal(1, func(null).length);
  test.equal("param1 is null", func(null)[0].err.message);

  // Call function compiled
  test.equal("called1",  funcCompiled("1"));
  test.equal(1, funcCompiled(1).length);
  test.equal("param1 is not a string", funcCompiled(1)[0].err.message);
  test.equal(1, funcCompiled(null).length);
  test.equal("param1 is null", funcCompiled(null)[0].err.message);

  // Check in command for string
  var funcPrototype = Validator([
    {type:'string', position: 0, name:'param1', checks: {in: ["open", "close", "store"]}}
  ], this, function(param1) {
    return "called" + param1;
  });

  // Normal and compiled function
  var func = funcPrototype.func();
  var funcCompiled = funcPrototype.compile();

  test.equal("param1 tes not found in [ 'open', 'close', 'store' ]", func("tes")[0].err.message);
  test.equal("calledstore", func("store"));
  test.equal("param1 tes not found in [ 'open', 'close', 'store' ]", funcCompiled("tes")[0].err.message);
  test.equal("calledstore", funcCompiled("store"));
  test.done();
}

exports.shouldCorrectlyTestFunctionValidationAgainstNotStringAndRegExpMatch = function(test) {
  var func = Validator([
    {type:'regexp_match', position: 0, name:'param1', regexp:/^mine/}
  ], this, function(param1) {
    return "called" + param1;
  }).func();

  // Call function
  test.equal(1, func("1").length);
  test.equal("param1 did not match regexp /^mine/", func("1")[0].err.message);
  test.equal("calledmine", func("mine"));
  test.equal("param1 is not a string", func(1)[0].err.message);
  test.equal("param1 is null", func(null)[0].err.message);
  test.done();
}

exports.shouldCorrectlyTestFunctionValidationAgainstNotNumber = function(test) {
  // Simple no number test
  var func = Validator([
    {type:'number', position: 0, name:'param1'}
  ], this, function(param1) {
    return "called" + param1;
  }).func();

  // Call function
  test.equal("param1 is null", func(null)[0].err.message);
  test.equal("param1 is not a number", func("hello")[0].err.message);

  // Simple number range check, lt and gt
  func = Validator([
    {type:'number', position: 0, name:'param1', checks: {gt:5, lt:1000}}
  ], this, function(param1) {
    return "called" + param1;
  }).func();

  test.equal("param1 is null", func(null)[0].err.message);
  test.equal("param1 value of 2000 is greater than 1000", func(2000)[0].err.message);
  test.equal("param1 value of 1 is less than 5", func(1)[0].err.message);
  test.equal("called7", func(7));

  // Simple number range check, lte and gte
  func = Validator([
    {type:'number', position: 0, name:'param1', checks: {gte:5, lte:1000}}
  ], this, function(param1) {
    return "called" + param1;
  }).func();

  test.equal("param1 is null", func(null)[0].err.message);
  test.equal("param1 value of 2000 is greater than 1000", func(2000)[0].err.message);
  test.equal("param1 value of 1 is less than 5", func(1)[0].err.message);
  test.equal("called7", func(7));

  // Simple number range check, in an array of values
  func = Validator([
    {type:'number', position: 0, name:'param1', checks: {in:[1, 2, 3]}}
  ], this, function(param1) {
    return "called" + param1;
  }).func();

  test.equal("param1 is null", func(null)[0].err.message);
  test.equal("param1 value of 8 not found in [ 1, 2, 3 ]", func(8)[0].err.message);
  test.equal("called1", func(1));
  test.done();
}

exports.shouldCorrectlyHandleObjectValidations = function(test) {
  // Simple object validator, uses the same rules as above
  var func = Validator([
    {type:'object', position: 0, name:'param1', checks: {
      'age': {type:'number', checks:{lt: 100, gt:5}},
      'email':{type: 'string', checks:{in: ["user@user.com"]}},
      'address.street': {type:'regexp_match', regexp:/^us/}
    }}
  ], this, function(param1) {
    return "called" + param1;
  }).func();

  test.equal("age value of 120 is greater than 100", func({age:120, name:'test', email:"test@in.com", address:{street:"aus road"}})[0].err.message);
  test.equal("email test@in.com not found in [ 'user@user.com' ]", func({age:120, name:'test', email:"test@in.com", address:{street:"aus road"}})[1].err.message);
  test.equal("address.street did not match regexp /^us/", func({age:120, name:'test', email:"test@in.com", address:{street:"aus road"}})[2].err.message);
  test.done();
}

exports.shouldCorrectlyHandleNestedObjectValidations = function(test) {
  // Simple object validator, uses the same rules as above
  var func = Validator([
    {type:'object', position: 0, name:'param1', checks: {
      'name': {type:'string'},
      'email':{type: 'string'},
      'address.street': {type:'string'},
      'price': {type: 'object', checks: {
        'currency': {type: 'string', checks: {in:['USD', 'EUR']}},
        'amount': {type: 'number', checks: {gt:0}}
      }}
    }}
  ], this, function(param1) {
    return "called" + param1;
  }).func();

  var results = func({price:{currency:'NOK', amount:-1}});
  test.equal(5, results.length);
  test.equal("no object member name", results[0].err.message);
  test.equal("no object member email", results[1].err.message);
  test.equal("no object member address.street", results[2].err.message);
  test.equal("price.currency NOK not found in [ 'USD', 'EUR' ]", results[3].err.message);
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
  var func = Validator([
    {type:'object', position: 0, name:'param1', checks: {
      'email':{type: 'function', func: customerEmailValidator},
    }}
  ], this, function(param1) {
    return "called" + param1;
  }).func();

  var results = func({email:'dome@dome.com'});
  test.equal(1, results.length);
  test.equal("only emails from gmail allowed", results[0].err.message);
  test.equal("function", results[0].validation.type);
  test.equal("dome@dome.com", results[0].value);

  // Simple object validator, uses the same rules as above
  var func = Validator([
    {type:'object', position: 0, name:'param1',
      checks: {
        person: {type: 'object',
          checks: {
            'email': {type: 'function', func: customerEmailValidator}
          }
        }
      }
    }
  ], this, function(param1) {
    return "called" + param1;
  }).func();

  var results = func({person:{email:'dome@dome.com'}});
  test.equal(1, results.length);
  test.equal("only emails from gmail allowed", results[0].err.message);
  test.equal("person.email", results[0].name);
  test.done();
}

exports.shouldCorrectlyFailOnFirstError = function(test) {
  // Simple object validator, uses the same rules as above
  var func = Validator([
    {type:'object', position: 0, name:'param1', checks: {
      'name': {type:'string'},
      'email':{type: 'string'},
      'address.street': {type:'string'},
      'price': {type: 'object', checks: {
        'currency': {type: 'string', checks: {in:['USD', 'EUR']}},
        'amount': {type: 'number', checks: {gt:0}}
      }}
    }}
  ], this, function(param1) {
    return "called" + param1;
  }, {failOnFirst:true}).func();

  var results = func({price:{currency:'NOK', amount:-1}});
  test.equal(1, results.length);
  test.equal("no object member name", results[0].err.message);
  test.done();
}

// exports.shouldCorrectlyTestFunctionCompiledValidationAgainstNotNull = function(test) {
//   // Function 1
//   var func = Validator([
//     {type:'string', position: 0, name:'param1'}
//   ], this, function(param1) {
//     return "called" + param1;
//   }).func();

//   // Function 2
//   var func2 = Validator([
//     {type:'string', position: 0, name:'param1'}
//   ], this, function(param1) {
//     return "called" + param1;
//   }).compile();

//   // Benchmarks
//   var s = new Date().getTime();

//   for(var i = 0; i < 10000; i++) {
//     func(1);
//   }

//   console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% :: " + (new Date().getTime() - s));

//   var s = new Date().getTime();

//   for(var i = 0; i < 10000; i++) {
//     func2(1);
//   }

//   console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% :: " + (new Date().getTime() - s));
//   test.done();
// }












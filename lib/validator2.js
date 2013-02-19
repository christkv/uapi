var esprima = require("esprima")
  , format = require('util').format
  , isRegExp = require('util').isRegExp;

var Validator = function() {  
  this._validators = [];
  this._function = null;
}

var interpreter

Validator.notnull = function(name) {  
  var validator = new Validator();
  validator._validators.push({
      param: name
    , type: 'notnull'
    , func: validateNotNull
  })

  return validator;
}

Validator.string = function(name, checks) {
  var validator = new Validator();
  validator._validators.push({
      param: name
    , type: 'string'
    , checks: checks
    , func: validateString
  })

  return validator;
}

var mapValidatorsToParamNames = function(validators, params) {
  // Map the parameters to the validators
  for(var i = 0; i < params.length; i++) {
    var param = params[i].name;

    // Locate the param name
    for(var j = 0; j < validators.length; j++) {
      var validator = validators[j];
      if(param == validator.param) {
        validator.index = i;
        break;
      }
    }
  }
}

Validator.prototype.interpreted = function(context, func) {
  if(context == null || typeof context != 'object') throw new Error("context must be an object");
  if(func == null || typeof func != 'function') throw new Error("func must be a function");

  var self = this;
  // Parse the function to create a list of arguments
  var funcString = func.toString();
  var parseTree = esprima.parse("var func = " + funcString);
  // Maps the parameters
  var params = parseTree.body[0].declarations[0].init.params;
  // Map the params to the validators
  mapValidatorsToParamNames(self._validators, params);

  // Return the wrapper function
  return function() {
    var args = Array.prototype.slice.call(arguments, 0);
    var errors = [];

    // Run across all the validators
    for(var i = 0; i < self._validators.length; i++) {
      var validation = self._validators[i];
      // Execute validation
      validation.func(errors, validation, args[validation.index], validation.param);

      // // console.dir(validator)
      // if(validation.type == 'notnull') {
      //   validation.func(errors, validation, args[validation.index], validation.param);
      // } else if(validation.type == 'string') {
      //   validation.func(err)
      // }

      // If we wish to fail on first validation return now
      if(errors.length > 0 && self.failOnFirst) return errors;
    }

    // If we have an error return it
    if(errors.length > 0) return errors;
    // Apply parameters to original function
    return func.apply(context, arguments);
  }
}

//
// Validator instance methods
//
Validator.prototype.failOnFirstError = function(failOnFirst) {
  this.failOnFirst = failOnFirst;
  return this;
}

//
// Validators
//
var validateNotNull = function(_errors, _validation, _value, _name) {
  if(_value == null)
    _errors.push({
      err: new Error(format("%s is null", _name)),
      validation: _validation,
      value: _value,
      name: _name
    });
}

// validate string function
var validateString = function(_errors, _validation, _value, _name) {
  if(_value == null)  {
    _errors.push({
      err: new Error(format("%s is null", _name)),
      validation: _validation,
      value: _value,
      name: _name
    });
  } else if(typeof _value != 'string') {
    _errors.push({
      err: new Error(format("%s is not a string", _name)),
      validation: _validation,
      value: _value,
      name: _name
    });
  } else if(typeof _value == 'string' && typeof _validation.checks == 'object') {
    var checks = _validation.checks;

    if(Array.isArray(checks.in) && checks.in.indexOf(_value) == -1) {
      _errors.push({
        err: new Error(format("%s '%s' not found in %s", _name, _value, format(checks.in))),
        validation: _validation,
        value: _value,
        name: _name
      });
    } else if(typeof checks.lt == 'number' && _value.length > checks.lt) {
      _errors.push({
        err: new Error(format("%s value of '%s' is longer than %d characters", _name, _value, checks.lt)),
        validation: _validation,
        value: _value,
        name: _name
      });
    } else if(typeof checks.gt == 'number' && _value.length < checks.gt) {
      _errors.push({
        err: new Error(format("%s value of '%s' is shorter than %d characters", _name, _value, checks.gt)),
        validation: _validation,
        value: _value,
        name: _name
      });
    } else if(isRegExp(checks.regexp) && _value.match(checks.regexp) == null) {
      _errors.push({
        err: new Error(format("%s value of '%s' did not match regexp %s", _name, _value, checks.regexp.toString())),
        validation: _validation,
        value: _value,
        name: _name
      });
    }
  }
}

exports.Validator = Validator;
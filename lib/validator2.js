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
  validator._validators.push(createStringValidator(validator, name, checks));
  return validator;
}

var createStringValidator = function(root, name, checks) {
  return {
      param: name    
    , type: 'string'
    , checks: checks
    , func: validateString      
    , root: root
  }
}

Validator.number = function(name, checks) {
  var validator = new Validator();
  validator._validators.push(createNumberValidator(validator, name, checks));
  return validator;
}

var createNumberValidator = function(root, name, checks) {
  return {
      param: name
    , type: 'number'
    , checks: checks
    , func: validateNumber   
    , root: root   
  }
}

Validator.object = function(name, func) {
  var validator = new Validator();
  validator._validators.push(createObjectValidator(validator, name, func));
  return validator;  
}

var createFunctionValidator = function(root, name, func) {
  return {
      param: name
    , type: 'function'
    , checks: func
    , func: validateFunction
    , root: root
  }  
}

createObjectValidator = function(root, name, func) {
  var objectValidations = [];

  // Run the validation list
  var context = {
    number: function(objectName, checks) {
      objectValidations.push(createNumberValidator(root, objectName, checks))
    },
    string: function(objectName, checks) {
      objectValidations.push(createStringValidator(root, objectName, checks))
    },
    object: function(objectName, checks) {
      objectValidations.push(createObjectValidator(root, objectName, checks));
    },
    function: function(objectName, checks) {
      objectValidations.push(createFunctionValidator(root, objectName, checks));
    }}

  // Let's get the list of validations we are performing on the object
  func.apply(context);

  // Let's get all the checks
  return {
      param: name
    , type: 'object'
    , checks: objectValidations
    , func: validateObject
    , root: root
  };
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

var validateNumber = function(_errors, _validation, _value, _name) {
  if(_value == null)  {
    _errors.push({
      err: new Error(format("%s is null", _name)),
      validation: _validation,
      value: _value,
      name: _name
    });
  } else if(typeof _value != 'number') {
    _errors.push({
      err: new Error(format("%s is not a number", _name)),
      validation: _validation,
      value: _value,
      name: _name
    });
  } else if(_validation.checks != null && typeof _validation.checks == 'object') {
    var checks = _validation.checks;

    if(typeof checks.lt == 'number' && _value > checks.lt) {
      _errors.push({
        err: new Error(format("%s value of %d is greater than %d", _name, _value, checks.lt)),
        validation: _validation,
        value: _value,
        name: _name
      });
    } else if(typeof checks.gt == 'number' && _value < checks.gt) {
      _errors.push({
        err: new Error(format("%s value of %d is less than %d", _name, _value, checks.gt)),
        validation: _validation,
        value: _value,
        name: _name
      });
    } else if(typeof checks.lte == 'number' && _value >= checks.lte) {
      _errors.push({
        err: new Error(format("%s value of %d is greater than %d", _name, _value, checks.lte)),
        validation: _validation,
        value: _value,
        name: _name
      });
    } else if(typeof checks.gte == 'number' && _value <= checks.gte) {
      _errors.push({
        err: new Error(format("%s value of %d is less than %d", _name, _value, checks.gte)),
        validation: _validation,
        value: _value,
        name: _name
      });
    } else if(Array.isArray(checks.in) && checks.in.indexOf(_value) == -1) {
      _errors.push({
        err: new Error(format("%s value of %d not found in %s", _name, _value, format(checks.in))),
        validation: _validation,
        value: _value,
        name: _name
      });
    }
  }
}

var validateObject = function(_errors, _validation, _value, _name, _top_value) {
  // Iterate over all the validations
  for(var i = 0; i < _validation.checks.length; i++) {
    var check = _validation.checks[i];
    // Locate the value
    var value = _value[check.param];
    
    // Check if it's a nested value check
    if(check.param.split('.').length > 1) {
      var names = check.param.split('.');
      value = _value;

      for(var j = 0; j < names.length; j++) {
        value = value[names[j]];

        if(value == null) {
          break;
        }
      }
    }

    var final_name = _top_value != null ? _top_value + "." + check.param : check.param;
    // No element exists with the name
    if(value == null) {
      _errors.push({
        err: new Error(format("no object member %s", final_name)),
        validation: check,
        value: undefined,
        name: check.param
      });
      if(_validation.root.failOnFirst) return;
    } else {
      // Trigger on the type of value
      check.func(_errors, check, value, final_name, final_name);      
      if(_errors.length > 0 && _validation.root.failOnFirst) return;
    }
  }
}

var validateFunction = function(_errors, _validation, _value, _name, _top_value) {
  var errors = _validation.checks(_name, _value);
  for(var i = 0; i < errors.length; i++) {
    _errors.push({
      err: errors[i],
      validation: _validation,
      value: _value,
      name: _name
    });
  }
}

exports.Validator = Validator;
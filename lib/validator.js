var format = require('util').format;

var Validator = function(validatorObject, self, coreFunction, options) {
  var self = this;
  this.callbackFunctions = [];

  if(!(this instanceof Validator)) return new Validator(validatorObject, self, coreFunction, options);
  // All parts of the validator
  this._validatorObject = validatorObject;
  this._self = self;
  this._coreFunction = coreFunction;
  this._options = options = options ? options : {};

  // Return the validator function
  this._function = function() {
    var errors = [];
    var callback = null;
    // Split the arguments
    var args = Array.prototype.slice.call(arguments, 0);
    var functionArguments = arguments;
    // If we have a callback pop it otherwise return
    if(args.length > 0 && typeof args[args.length - 1] == 'function') {
      callback = args.pop();
    }

    if(Array.isArray(validatorObject)) {
      // Go through the keys and validate
      for(var i = 0; i < validatorObject.length; i++) {
        var validation = validatorObject[i];
        var value = args[validation.position];

        switch(validation.type) {
          case 'array':
            validateArray(errors, validation, value, validation.name, args, options, self);
            break;
          case 'object':
            validateObject(errors, validation, value, null, options, args, self);
            break;
          case 'number':
            validateNumber(errors, validation, value, validation.name);
            break;
          case 'string':
            validateString(errors, validation, value, validation.name);
            break;
          case 'regexp_match':
            validateRegExp(errors, validation, value, validation.name);
            break;
          case 'notnull':
            validateNotNull(errors, validation, value, validation.name);
            break;
          case 'function':
            validateFunction(errors, validation, value, validation.name, args);
            break;
          case 'callback':
            self.callbackFunctions.push({errors:errors, validation:validation, value:value, name:validation.name, args:args});
            break;
        }

        if(options['failOnFirst']) return errors;
      }
    } else {
      throw new Error("validatorObject must be an Array")
    }

    if(self.callbackFunctions.length > 0) {
      var numberOfCallbacksLeft = self.callbackFunctions.length;
      // Execute all the functions
      while(self.callbackFunctions.length > 0) {
        var callbackFunction = self.callbackFunctions.pop();
        // Fetch the function
        var func = callbackFunction.validation.func;
        // Execute the functions
        func(callbackFunction.name, callbackFunction.value, callbackFunction.args, function(err, result) {
          numberOfCallbacksLeft = numberOfCallbacksLeft - 1
          // If we have errors add them
          if(err != null && Array.isArray(err)) {
            // for all errors add context
            for(var i = 0; i < err.length; i++) {
              errors.push({
                err: err[i],
                validation: callbackFunction.validation,
                value: callbackFunction.value,
                name: callbackFunction.name
              })
            }
          }

          // We are done
          if(numberOfCallbacksLeft == 0) {
            // If we have errors and a callback
            if(typeof callback == 'function' && errors.length > 0) {
              return callback(errors, null);
            } else if(callback == null && errors.length > 0) {
              return errors;
            }

            // Call the wrapped function
            return coreFunction.apply(self, Array.prototype.slice.call(functionArguments, 0));
          }
        })
      }

    } else {
      // If we have errors and a callback
      if(typeof callback == 'function' && errors.length > 0) {
        return callback(errors, null);
      } else if(callback == null && errors.length > 0) {
        return errors;
      }

      // Call the wrapped function
      return coreFunction.apply(self, Array.prototype.slice.call(functionArguments, 0));
    }
  }
}

/**********************************************************************************
 *
 *  Returns interpreted function
 *
 **********************************************************************************/
 Validator.prototype.func = function func() {
   return this._function;
 }

/**********************************************************************************
 *
 *  Validation functions used in the plugin
 *
 **********************************************************************************/
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
        err: new Error(format("%s %s not found in %s", _name, _value, format(checks.in))),
        validation: _validation,
        value: _value,
        name: _name
      });
    } else if(typeof checks.lt == 'number' && _value.length > checks.lt) {
      _errors.push({
        err: new Error(format("%s value of %s is longer than %d characters", _name, _value, checks.lt)),
        validation: _validation,
        value: _value,
        name: _name
      });
    } else if(typeof checks.gt == 'number' && _value.length < checks.gt) {
      _errors.push({
        err: new Error(format("%s value of %s is shorter than %d characters", _name, _value, checks.gt)),
        validation: _validation,
        value: _value,
        name: _name
      });
    } else if(typeof checks.lte == 'number' && _value.length >= checks.lte) {
      _errors.push({
        err: new Error(format("%s value of %s is longer than %d characters", _name, _value, checks.lte)),
        validation: _validation,
        value: _value,
        name: _name
      });
    } else if(typeof checks.gte == 'number' && _value.length <= checks.gte) {
      _errors.push({
        err: new Error(format("%s value of %s is shorter than %d characters", _name, _value, checks.gte)),
        validation: _validation,
        value: _value,
        name: _name
      });
    }
  }
}

// validate number
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

// validate regexp
var validateRegExp = function(_errors, _validation, _value, _name) {
  if(_value == null) {
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
  } else if(_value.match(_validation.regexp) == null) {
    _errors.push({
      err: new Error(format("%s did not match regexp %s", _name, _validation.regexp.toString())),
      validation: _validation,
      value: _value,
      name: _name
    });
  }
}

// Validate not null
var validateNotNull = function(_errors, _validation, _value, _name) {
  if(_value == null)
    _errors.push({
      err: new Error(format("%s is null", _name)),
      validation: _validation,
      value: _value,
      name: _name
    });
}

// Validate using custom function
var validateFunction = function(_errors, _validation, _value, _name, _args) {
  // Locate function
  var func = typeof _validation.func == 'function' ? _validation.func : _validation.checks.each;
  // given the function let's execute it
  var functionErrors = func(_name, _value, _args);

  // console.dir(functionErrors)

  // for all errors add context
  for(var i = 0; i < functionErrors.length; i++) {
    _errors.push({
      err: functionErrors[i],
      validation: _validation,
      value: _value,
      name: _name
    })
  }
}

// Validate array
var validateArray = function(_errors, _validation, _value, _name, _args, _options, _self) {
  if(_value == null)  {
    _errors.push({
      err: new Error(format("%s is null", _name)),
      validation: _validation,
      value: _value,
      name: _name
    });
    // Return on first fail
    if(_options['failOnFirst']) return;
  } else if(!Array.isArray(_value)) {
    _errors.push({
      err: new Error(format("%s is not an array", _name)),
      validation: _validation,
      value: _value,
      name: _name
    });
    // Return on first fail
    if(_options['failOnFirst']) return;
  } else if(_validation.checks != null && typeof _validation.checks == 'object') {
    var checks = _validation.checks;
    // We have an in array check
    if(Array.isArray(checks.in)) {
      for(var i = 0; i < _value.length; i++) {
        if(checks.in.indexOf(_value[i]) == -1) {
          _errors.push({
            err: new Error(format("%s value of %s not found in %s", _name, _value[i], format(checks.in))),
            validation: _validation,
            value: _value,
            name: _name
          });
        }
      }
    } else if(typeof checks.each == 'function') {
      // Iterate over all the values in the array
      for(var j = 0; j < _value.length; j++) {
        _self.callbackFunctions.push({errors:_errors, validation:{func:checks.each}, value:_value[j], name:_validation.name, args:_args});
      }
    } else if(_validation.func) {
      validateFunction(_errors, _validation, _value, _validation.name, _args);
    }
  }
}

// Validate object
var validateObject = function(_errors, _validation, _value, _name, _options, _args, _self) {
  if(_value == null)  {
    _errors.push({
      err: new Error(format("%s is null", _name)),
      validation: _validation,
      value: _value,
      name: _name
    });
    // Return on first fail
    if(_options['failOnFirst']) return;
  } else if(_validation.checks != null && typeof _validation.checks == 'object') {
    // Contains the path name of the variable for validations
    var nestedName = name;
    // Let's iterate over all the checks
    var keys = Object.keys(_validation.checks);
    for(var i = 0; i < keys.length; i++) {
      // Get the name
      var name = keys[i];
      // Fetch the validation
      var checksvalidation = _validation.checks[name];
      // Add the name to the validation if it's not already there
      if(checksvalidation['name'] == null) checksvalidation['name'] = name;

      // Split the name, find the field and validate
      var paths = name.split(".");
      var objectPointer = _value;

      // Go down the path and find the variable
      for(var j = 0; j< paths.length; j++) {
        objectPointer = objectPointer[paths[j]];
        // name it
        nestedName = _name != null ? _name + "." + paths[j] : name;
        // If no pointer
        if(typeof objectPointer == 'undefined') {
          _errors.push({
            err: new Error(format("no object member %s", name)),
            validation: _validation,
            value: undefined,
            name: nestedName
          });

          // Return on first fail
          if(_options['failOnFirst']) return;
          // Otherwise break;
          break;
        }
      }

      // We have an object to check
      if(typeof objectPointer != 'undefined') {
        // Switch and execute
        switch(checksvalidation.type) {
          case 'array':
            validateArray(_errors, checksvalidation, objectPointer, nestedName, _args, _options, _self);
            break;
          case 'object':
            validateObject(_errors, checksvalidation, objectPointer, nestedName, _options, _args, _self);
            break;
          case 'number':
            validateNumber(_errors, checksvalidation, objectPointer, nestedName);
            break;
          case 'string':
            validateString(_errors, checksvalidation, objectPointer, nestedName);
            break;
          case 'regexp_match':
            validateRegExp(_errors, checksvalidation, objectPointer, nestedName);
            break;
          case 'notnull':
            validateNotNull(_errors, checksvalidation, objectPointer, nestedName);
            break;
          case 'function':
            validateFunction(_errors, checksvalidation, objectPointer, nestedName, _args);
            break;
          case 'callback':
            _self.callbackFunctions.push({errors:_errors, validation:checksvalidation, value:objectPointer, name:nestedName, args:_args});
            break;
        }

        // Return on first fail
        if(_options['failOnFirst'] && _errors.length > 0) return;
      }
    }
  }
}

/**********************************************************************************
 *
 *  Compile the validation using eval and return a cached function
 *
 **********************************************************************************/
// Validator.prototype.compile = function compile() {
var _compile = function compile() {
  // Build the validator
  var validatorFunctionStrings = [];
  // Let's parse the function
  var parsedFunction = jsp.parse("var __func = " + this._coreFunction.toString());
  // Extract the ast information down to the function
  var functionAST = parsedFunction[1][0][1][0][1]
  // Get parameters
  var parameters = functionAST[2];

  // Build a function to wrap the original function
  validatorFunctionStrings.push(format("function(%s) {", parameters.join(",")));
  validatorFunctionStrings.push("\tvar args = Array.prototype.slice.call(arguments, 0);")
  validatorFunctionStrings.push("\tvar _errors = [];\n")

  // Split the arguments
  var args = Array.prototype.slice.call(arguments, 0);
  // If we have a callback pop it otherwise return
  if(args.length > 0 && typeof args[args.length - 1] == 'function') {
    callback = args.pop();
  }

  // Go through the keys and validate
  for(var i = 0; i < this._validatorObject.length; i++) {
    var validation = this._validatorObject[i];
    var value = args[validation.position];
    var name = parameters[validation.position];

    // console.log("------------------------------------------------- value")
    // console.log("name = " + name)
    // console.log("value = " + value)
    // console.log("validation = " + validation)

    switch(validation.type) {
      // case 'object':
      //   validateObject(errors, validation, value, null, options);
      //   break;
      // case 'number':
      //   validateNumber(errors, validation, value, validation.name);
      //   break;
      case 'string':
        var buildCodeLine1 = format("if(%s == null) {" + "\n"
          + "  _errors.push({" + "\n"
          + "    err: new Error(\"%s is null\")," + "\n"
          + "    validation: validatorObject[%d]," + "\n"
          + "    value: %s," + "\n"
          + "    name: \"%s\" })", name, name, i, name, name);

        var buildCodeLine2 = format("} else if(typeof %s != 'string') {" + "\n"
          + "  _errors.push({" + "\n"
          + "    err: new Error(\"%s is not a string\")," + "\n"
          + "    validation: validatorObject[%d]," + "\n"
          + "    value: %s," + "\n"
          + "    name: \"%s\" })", name, name, i, name, name);

        var buildCodeLine3 = format("} else if(typeof %s == 'string' && typeof validatorObject[%d].checks == 'object') {" + "\n"
          + "  if(Array.isArray(validatorObject[%d].checks.in) && validatorObject[%d].checks.in.indexOf(%s) == -1)"
          + "    _errors.push({" + "\n"
          + "      err: new Error(\"%s \" + args[%d] + \" not found in \" + format(validatorObject[%d].checks.in))," + "\n"
          + "      validation: validatorObject[%d]," + "\n"
          + "      value: %s," + "\n"
          + "      name: \"%s\" })}", name, i, i, i, name, name, i, i, i, name, name);

        // Build the elements of the code
        validatorFunctionStrings.push(buildCodeLine1);
        validatorFunctionStrings.push(buildCodeLine2);
        validatorFunctionStrings.push(buildCodeLine3);
        break;
      // case 'regexp_match':
      //   validateRegExp(errors, validation, value, validation.name);
      //   break;
      case 'notnull':
        validatorFunctionStrings.push(format("\tif(%s == null) { _errors.push({err: new Error(\"%s is null\"), validation: validatorObject[%d], value: %s, name: \"%s\" })}", name, name, name, name));
        break;
      // case 'function':
      //   validateFunction(_errors, checksvalidation, objectPointer, validation.name);
      //   break;
    }
  }

  // If the last function is a callback call it with any errors
  if(parameters.length > 0) {
    validatorFunctionStrings.push(format("\tif(typeof %s == 'function') return %s(_errors, null);", parameters[parameters.length - 1], parameters[parameters.length - 1]));
  }
  // Finish up the function
  validatorFunctionStrings.push(format("\tif(_errors.length == 0) return coreFunction(%s);", parameters.join(",")));
  validatorFunctionStrings.push("\treturn _errors;");
  validatorFunctionStrings.push("}");



  // console.log("------------------------------------------------------------------ NON COMPILED")
  // var a = 1;
  // console.dir(functionAST)
  // console.dir(parameters)
  // console.log(validatorFunctionStrings.join("\n"))

  // Holds the compiled function
  var compiledFunction = null;
  var coreFunction = this._coreFunction;
  var validatorObject = this._validatorObject;

  // validatorFunctionStrings.join("return a;")

  // Compile the function
  eval("compiledFunction = " + validatorFunctionStrings.join("\n"));
  // console.dir("------------------------------------------------------------------ COMPILED")
  // console.log(compiledFunction.toString())
  // console.dir(compiledFunction(null))
  // var func = new this.Function(parameters, validatorFunctionStrings.join("\n"));
  // return func;
  return compiledFunction;
}

exports.Validator = Validator;
var vows = require('vows');
var ensurers = require('./vows.helpers.js');

vows.describe('test reopen database').addBatch( 
		ensurers.ensureEmptyOpenDatabase()).addBatch( 
		ensurers.ensureEmptyOpenDatabase()).run();

//TODO: Test for duplication, index changing

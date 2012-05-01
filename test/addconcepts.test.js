var vows = require('vows');
var ensurers = require('./vows.helpers.js');

var singleMemberContext = {name:"Models", properties:{index:[["name", 1]], indexOptions:{ unique: true}}, members:[{name:"Integra"}]};
var multiMemberContext =  {name:"Models", properties:{index:[["name", 1]], indexOptions:{ unique: true}}, members:[{name:"CRX"},{name:"ML 500"}]};

vows.describe('test addConcepts').addBatch( 
			ensurers.ensureEmptyOpenDatabase()
					).addBatch( 
			ensurers.ensureConceptsLoaded(
					singleMemberContext
						, "Single concept:", true, 0)).addBatch(
            ensurers.ensureConceptsLoaded(
					multiMemberContext
                        , "Add concepts to existing non-empty context:", true, 0)).addBatch(
            ensurers.ensureConceptsLoaded(
                    singleMemberContext
                        , "Re-add existing member:", true, 0) ).run(
            function(results){console.dir(results);});

//TODO: Test for duplication, index changing, malformed objects

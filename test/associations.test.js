var vows = require('vows');
var ensurers = require('./vows.helpers.js');

// Collections that will contain the inter-context associations
var abContext = {name:"A_B", properties:{index:[["memberId", 1],[ "type", 1]], indexOptions:{ unique: true}}};
var baContext = {name:"B_A", properties:{index:[["memberId", 1],[ "type", 1]], indexOptions:{ unique: true}}};

var axisAction = {srcContextId:"A", srcMemberId:"1", axisId:"99", tgtContextId:"B", tgtMemberId:"2", isAssociate:true};
var axisActionAppend = {srcContextId:"A", srcMemberId:"1", axisId:"99", tgtContextId:"B", tgtMemberId:"4", isAssociate:true};
var axisActionOther = {srcContextId:"A", srcMemberId:"1", axisId:"108", tgtContextId:"B", tgtMemberId:"6", isAssociate:true};
axisUndoActionOther = {srcContextId:"A", srcMemberId:"1", axisId:"108", tgtContextId:"B", tgtMemberId:"6", isAssociate:false};

vows.describe('test addConcepts').addBatch( 
			ensurers.ensureEmptyOpenDatabase()
														).addBatch( 
//Setup	else duplicate items are generated
			ensurers.ensureContextRegisters(
					abContext
						, "A_B context:") ).addBatch( 
			ensurers.ensureContextRegisters(
					baContext
						, "B_A context:") ).addBatch( 
//end setup
			ensurers.ensureAssociationsAdjusted(
					axisAction
						, "Single association:", true, 0) ).addBatch( 
			ensurers.ensureAssociationsAdjusted(
					axisActionAppend
						, "Append association:", true, 0) ).addBatch( 
			ensurers.ensureAssociationsAdjusted(
					axisActionOther
						, "Tag on different axis:", true, 0) ).addBatch( 
			ensurers.ensureAssociationsAdjusted(
					axisUndoActionOther
						, "Dissociate:", false, 0) ).run();

//TODO: Test for duplication, index changing, malformed objects

var conceptSpace = require('../lib/conceptspace.js')('concept-space-test')
  , vows = require('vows')
  , assert = require('assert')
  , async = require('async');

exports.ensureEmptyOpenDatabase = function() {
    var context = { 
    	'open database, ' : { topic: function () {
			console.log("Open");
			conceptSpace.open(this.callback);
		  },
		  'after a successful `open`,': {
		    topic: function (cSpace) {
				console.log("Drop");
		        cSpace.db.dropDatabase(this.callback);
		    },
		    'after a successfull drop': function (done) {
		    	assert.isTrue(done);
		    }
		  }
	    }
	};
   
    return context;
};

exports.ensureConceptsAdjusted = function(concept, title, hasDuplicates) {
	var context = {};
	context[title] = { 
		topic: function () {
			conceptSpace.adjustConcepts(concept, this.callback);
		},
    	'concepts adjusted':function(context){
			console.log("Test Concept adjust");
	        var members = context.members;

	        if(!context.members){
	        	return; 
	        }
	        
	        for(var imem=0; imem < members.length; imem++){
	        	console.log(context.name + " ).find(" + members[imem]._id);
	        	console.dir(members);
	        	conceptSpace.db.collection(context.name).find({_id:members[imem]._id}).toArray(function(err, documents){
	    			assert.isNull(err);
			        assert.isNotNull(documents);
			        if(!hasDuplicates){
			        	assert.equal(documents.length, 1);
			        }
	        	});
	        	if(members[imem].associations){
	        		var axes = members[imem].associations;
		        	for(var iax=0; iax < axes.length; iax++){
		        		var axisContexts = [];
		        		if(axes[iax].associate){
			        		axisContexts.concat(axes[iax].associate);
		        		}
		        		if(axes[iax].dissociate){
			        		axisContexts.concat(axes[iax].dissociate);
		        		}
				        for(var ictx=0; ictx < axisContexts.length; ictx++){
				        	var axisMembers = axisContexts[ictx].members;
				        	console.dir(axisMembers);
				        	for(var imem=0; imem < axisMembers.length; imem++){
					        	conceptSpace.db.collection(axisContexts[ictx].name).find(axisMembers[imem]).toArray(function(err, documents){
					    			assert.isNull(err);
							        assert.isNotNull(documents);
							        if(!hasDuplicates){
							        	assert.equal(documents.length, 1);
							        }
					        	});
							}
						}
					}
	        	}
			}    			     	        
    	}      
	};
   
    return context;
};

exports.ensureAssociationsAdjusted = function(tagAction, title, hasDuplicates, additional) {
	var context = {};
	context[title] = { 
		topic: function () {
			console.log("Adjust tagActions");
			conceptSpace.adjustAssociations(tagAction.srcContextId, tagAction.srcMemberId, tagAction.axisId
								, tagAction.tgtContextId, tagAction.tgtMemberId, tagAction.isAssociate, this.callback);
		},
    	'associations added':function(association){
			console.log("Test association contains");
			var contextName = conceptSpace.getConjoinedName(tagAction.srcContextId, tagAction.tgtContextId);
			var xContextName = conceptSpace.getConjoinedName(tagAction.tgtContextId, tagAction.srcContextId);
			console.dir({memberId:tagAction.srcMemberId, type:tagAction.axisId});
			conceptSpace.db.collection(contextName).find({memberId:tagAction.srcMemberId, type:tagAction.axisId}).toArray(function(err, documents){
				console.dir(documents);
				assert.isNull(err);
		        assert.isNotNull(documents);
		        if(!tagAction.isAssociate){
		        	if(documents.length > 0){
			        	console.log("Not matches");
			        	var pendingList = documents[0].associates.pending.toString();
				        assert.notMatch(pendingList, new RegExp("\\b" + tagAction.tgtMemberId + "\\b"));
		
				        var unsortedList = documents[0].associates.unsorted.toString();
				        assert.notMatch(unsortedList, new RegExp("\\b" + tagAction.tgtMemberId + "\\b"));
		        	}
		        }
		        else{
		        	assert.equal(documents.length, 1);
			        var pendingList = documents[0].associates.pending.toString();
			        console.log("Pendign list:");
			        console.log(pendingList + " ? " + tagAction.tgtMemberId);
			        assert.match(pendingList, new RegExp("\\b" + tagAction.tgtMemberId + "\\b"));
	
			        var unsortedList = documents[0].associates.unsorted.toString();
			        assert.match(unsortedList, new RegExp("\\b" + tagAction.tgtMemberId + "\\b"));
		        }
		     });
    			     
    	}      
	};
   
    return context;
};

exports.ensureConceptsLoaded = function(concept, title, hasDuplicates, additional) {
	var context = {};
	context[title] = { 
		topic: function () {
			console.log("Add Concepts");
			for(var i=0; i < additional; i++){
				concept.members.push({name: "test_" + i}); 				
			}
			conceptSpace.addConcept(concept, this.callback);
		},
    	'members added':function(context){
			console.log("Test Concepts");
	        var members = context.members;
	        
	        for(var imem=0; imem < members.length; imem++){
	        	conceptSpace.db.collection(context.name).find({name:members[imem].name}).toArray(function(err, documents){
	    			assert.isNull(err);
			        assert.isNotNull(documents);
			        if(!hasDuplicates){
			        	assert.equal(documents.length, 1);
			        }
	        	});
			}
    			     
    	}      
	};
   
    return context;
};

//ConceptSpace.prototype.registerContext = function(concept, cb) {
//ConceptSpace.prototype.registerAssociationType = function(axis, cb) {

exports.ensureAxesRegisters = function(axis, title) {
	var context = {};
	context[title] = { 
		topic: function () {
			console.log("Register axis type");
    		conceptSpace.registerAxis(axis, this.callback);
    	},
    	', register axis type':function(members){
			console.log("Test association type registered");		
	        for(var imem=0; imem < members.length; imem++){
	        	conceptSpace.db.collection(conceptSpace.axisRegistryName).find({name:members[imem].name}).toArray(function(err, documents){
	    			assert.isNull(err);
			        assert.isNotNull(documents);
			        // Cannot have duplicates
			        assert.equal(documents.length, 1);
	        	});
	        }    			     
    	}      
	};
   
    return context;
};


exports.ensureContextRegisters = function(context, title) {
	var ctxt = {};
	ctxt[title] = { 
		topic: function () {
			console.log("Register context");
    		conceptSpace.registerContext(context, this.callback);
    	},
    	', register context':function(context){
			console.log("Test context is registered in:" + conceptSpace.contextRegistryName);			
			console.dir(context);			
			conceptSpace.db.collection(conceptSpace.contextRegistryName).find({name:context.name}).toArray(function(err, documents){
				console.log("Found context registered");			
    			assert.isNull(err);
		        assert.isNotNull(documents);
		        // Cannot have duplicates
		        assert.equal(documents.length, 1);
        	});
    			     
    	}      
	};   
    return ctxt;
};

exports.ensureIntersecting = function(context, crossContext, filter, expectedConcepts, title) {
	var ctxt = {};
	ctxt[title] = { 
		topic: function () {
            debugger;
            conceptSpace.intersect(context, crossContext, filter, this.callback);
    	},
    	',context members':function(intersectionSteps){
    		console.log("intersectionSteps");
    		console.dir(intersectionSteps);
    		assert.isNotNull(intersectionSteps);
		    assert.isNotNull(intersectionSteps[intersectionSteps.length-1].ids);
		    var memberIds = intersectionSteps[intersectionSteps.length-1].ids;
			conceptSpace.db.collection(context.name).find({_id:{$in:memberIds}},{name:1}).toArray(function(err, docs){
				assert.isNull(err);
		        assert.isNotNull(docs);
                if(docs.length != expectedConcepts.length){
                    debugger;
                }
                assert.equal(docs.length, expectedConcepts.length);

			    for(var iname=0; iname < docs.length; iname++){
			    	var doc = docs[iname];	
			    	var nameFound = false;
			    	for(var iitem=0; iitem < expectedConcepts.length; iitem++){
				    	if(expectedConcepts[iitem].name == doc.name){
				    		nameFound = true;
				    		break;
				    	};
				    }
                    if(!nameFound){
                        debugger;
                    }
			    	assert.isTrue(nameFound);
			    }
        	});
    	}      
	};   
    return ctxt;
};

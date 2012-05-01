var Db = require('mongodb').Db,
  Connection = require('mongodb').Connection,
  Server = require('mongodb').Server,
  ObjectID = require('mongodb').ObjectID;
//var redis = require('redis');
var events = require('events'),
	async = require('async');

var Logger = require('bunyan');
var log = new Logger({ name: "myserver",streams: [{name: 'stdout', stream: process.stdout, level: 'debug'}, {name: 'stderr', stream: process.stderr}], serializers: Logger.stdSerializers});

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;

var STATE_CLOSE = 0,
STATE_OPENNING = 1,
STATE_OPEN = 2;

var $or="$or",$and="$and",$nor="$nor",$xor="$xor";

function ConceptSpace(databaseName, username, password) {
	  if (false == (this instanceof ConceptSpace)) {
		  return new ConceptSpace(databaseName, username, password);
	  }
	  log.info("Connecting to " + host + ":" + port + ", database:" +databaseName);
	  this.db = new Db(databaseName, new Server(host, port, {}), {auto_reconnect: true});
	//  this.redis = redis.createClient();
	  
	  this.state = STATE_CLOSE;

	  this.databaseName = databaseName;
	  this.username = username;
	  this.password = password;

	  //These offsets make the data easier to test and look at. Nothing more.
	  this.axisTypeOffset 			= 1000000;
      this.contextRegistryOffset 	= 20000000;
	  this.associationMapsOffset 	= 400000000;
	  
		  //TODO: Either give these a prefix or associate them with a meta description item.
      this.contextRegistryName 	= "__ContextRegistry";
	  this.associationMapsName 	= "__AssociationMaps";
      this.axisRegistryName 	= "__AssociationAxisRegistry";
	  this.traversalRoutes 		= "__TraversalRoutes";
	  this.intraContextConstraints = "__IntraContextConstraints";
	  
	  this._contextRegistry = {};
	  this._associationRegistry = {};
	  this._axisRegistry = {};
	  this._traversalRoutes = {};
	  this._pools = {};
      this._paths = {};

    this.emitter = new events.EventEmitter();

	  this.writeBundle = 1000;	  
};

/**
*
*/
ConceptSpace.prototype.open = function(cb) {
	var self = this;
	async.series([
         function(cb){
        	 _openAndAuthenticate(self, cb);
         }
         ,function(cb){
        	 _load(self, cb);
        }
      ],
	function (err, result) {
	    // We get here with either bad connection or invalid user
		if(err){
			log.fatal("Failed to open:" + err);
		}
		if(cb){
			log.debug("opened and loaded");		
			cb(err, self);
		}
		
	});
};

ConceptSpace.prototype.close = function(forceClose, cb) {
	this.db.close(forceClose, function(err, db) {
       if (err) {
           err.message = "Can't close database." + this.databaseName;// + JSON.stringify(path) + " by way of C realpath: " + error.message;
       } else {
    	   this.state = STATE_CLOSE;
       }
       if(cb){
          	cb(err, this);
       }
	});	
};


function _openAndAuthenticate(cSpace, cb) {
	 if(this.state != STATE_OPEN){
		 this.state = STATE_OPENNING;
		 cSpace.db.open(function(err, db) {
	       if (err) {
	           err.message = "Can't open database." +  cSpace.databaseName;// + JSON.stringify(args) ;
	       } 
	       if (db && cSpace.username) {
		          //do authenticate
	       		cSpace.db.authenticate(cSpace.username, cSpace.password, function(err) {
		              if (err) {
		                  err.message = "Invalid login for user:" + cSpace.username;
		              }
					 log.debug("DB login");
		             cb(err, cSpace);
	       		});
		    } else {
		    	//TODO: Enable when ready
		    	//	throw new Error("Cannot access DB without valid credentials.")
		    	this.state = STATE_OPEN;
				log.debug("DB open");
	            cb(err, cSpace);
	       }
		});
	}else{
		log.debug("DB already open");		
        cb(null, cSpace);
	}
};


//Load the registry locally
function _load(cSpace,cb){	
	async.series([
        function(cb){
        	cSpace.db.collection(cSpace.contextRegistryName).ensureIndex([['name', 1]], true, function(err, replies){});
        	_cacheCollection(cSpace, cSpace.contextRegistryName, cSpace._contextRegistry);
            cSpace.db.collection(cSpace.axisRegistryName).ensureIndex([['name', 1]], true, function(err, replies){});
            _cacheCollection(cSpace, cSpace.axisRegistryName, cSpace._axisRegistry);
            cSpace.db.collection(cSpace.associationMapsName).ensureIndex([['name', 1]], true, function(err, replies){});
        	_cacheCollection(cSpace, cSpace.associationMapsName, cSpace._associationRegistry);
        	cSpace.db.collection(cSpace.traversalRoutes).ensureIndex([['name', 1]], true, function(err, replies){});
        	_cacheCollection(cSpace, cSpace.traversalRoutes, cSpace._traversalRoutes);
        	cb(null,cSpace);
        }
    ], function (err, result) {
 	    // We get here with either bad connection or invalid user
 		if(err){
 			log.error("Failed to fill registry cache:" + err);
 		}
        _discoverRoutes(cSpace);
 		if(cb){
 			log.debug("caching loaded.");
 			cb(err, cSpace);
 		}
 		
 	});
};

//Load the registry locally
function _cacheCollection(cSpace, name, container, cb){
	cSpace.db.collection(name, function(err, collection) {
		if(err){
    		log.error(err);
		}
		collection.find(function(err, cursor) {
			if(err){
        		log.error(err);
			}
	        cursor.each(function(err, item) {
        		if(err){
            		log.error(err);
    			}	
    	        if(item != null) {
    	        	container[item.name] = container[item._id] = item;
            	}
    	     });          
    	  }); 
		log.debug("Cached collection:" + name);
    });
}

//Discover traversal paths.
function _discoverRoutes(cSpace){
    var outer=0;
    for(var item in cSpace._contextRegistry){
        var context = cSpace._contextRegistry[item];
        var inner = 0;
        for(var cross in cSpace._contextRegistry){
            if(++inner < outer){
               continue;
            }
            cSpace.extendTraversalRoutes(item, cross);
        }
        outer++;
    }
}

//Extend traversal paths to new or existing routes.
ConceptSpace.prototype.extendTraversalRoutes = function(srcContextId, tgtContextId){
    debugger;
    var context = this._contextRegistry[srcContextId];
    var tgtContext = this._contextRegistry[tgtContextId];
    if(this._paths[context.name] && this._paths[context.name].to[tgtContext.name]){
        return
    }

    //Add new route
    if(!this._paths[context.name]){
        this._paths[context.name]  = {to:{}};
    }
    this._paths[context.name].to[tgtContext.name] = currentRoute = this._traversalRoutes[context.name + "_" + tgtContext.name] = [{name:context.name, type:null}, {name:tgtContext.name, type:null}];
    this.extendTraversalRoutesRecursively(context, tgtContext);
}

//Extend traversal paths to existing routes recursively.
ConceptSpace.prototype.extendTraversalRoutesRecursively = function(context, crossContext){
    log.debug("extendTraversalRoutesRecursively for " + context.name + " and "+ crossContext.name);
    if(this._paths[crossContext.name]){
        for(var outerContextName in this._paths[crossContext.name].to){
            if(context.name != outerContextName){

                if(!this._traversalRoutes[context.name + "_" + outerContextName]){
                    this._traversalRoutes[context.name + "_" + outerContextName] = JSON.parse(JSON.stringify(this._traversalRoutes[context.name + "_" + crossContext.name])).concat([{name:outerContextName, type:null}]);
                    this.extendTraversalRoutesRecursively(context, this._contextRegistry[outerContextName]);
                }

                if(!this._traversalRoutes[outerContextName + "_" + context.name] && this._traversalRoutes[crossContext.name + "_" + context.name]){
                    debugger;
                    this._traversalRoutes[outerContextName + "_" + context.name] = [{name:outerContextName, type:null}].concat(JSON.parse(JSON.stringify(this._traversalRoutes[crossContext.name + "_" + context.name])));
                    this.extendTraversalRoutesRecursively(this._contextRegistry[outerContextName], context);
                }
            }
        }
    }
}

//{_id:%token%, associates:[{type:'%assocTypeId%',sorted:[%token%,%token%], pending:[%token%,%token%],unsorted:[%token%,%token%]}, {type:'%assocTypeId2%',sorted:[%token%,%token%], unsorted:[%token%,%token%]}}
function  _upsertAssociationOptimization(cSpace, contextName, memberId, axisTypeId, sortedList, cb){
	log.debug(" _upsertAssociationOptimization," + contextName + ", " + sortedList);

	cSpace.db.collection(contextName, function(err, collection) {
		if(err){
			log.error(err);
			cb(err, collection);				
		}

		var member = {memberId: memberId, type:axisTypeId};
		collection.update(member, {$set:{"associates.sorted":sortedList}, $pullAll:{"associates.pending":sortedList}}, {safe:false,upsert:true}, function(err,doc){
			log.debug("Associate optimized:"+ memberId + " in:" + contextName);
			if(err){
				//console.dir(err);
				log.error(err);
			}
			cb(err, doc);
		});
     });
};

//{memberId:%token%, associates:[{type:'%assocTypeId%',sorted:[%token%,%token%], pending:[%token%,%token%],unsorted:[%token%,%token%]}, {type:'%assocTypeId2%',sorted:[%token%,%token%], unsorted:[%token%,%token%]}}
function  _upsertAssociationsToContext(cSpace, contextName, tgtMemberId, xAxisId, srcMemberId, isAssociate, cb){
	log.debug(" _upsertAssociationsToContext," + contextName + ", " + tgtMemberId  + ", " +  xAxisId  + ", " +  srcMemberId + ", " + isAssociate);

	cSpace.db.collection(contextName, function(err, collection) {
		if(err){
			log.error(err);
			cb(err, collection);
		}

		var member = {memberId: tgtMemberId, type:xAxisId};
		if(isAssociate){
            var memberPush = {$set:{"associates.sorted":[]},$push:{"associates.pending":srcMemberId,"associates.unsorted":srcMemberId}};
			collection.update(member, memberPush, {safe:false, upsert:true}, function(err){
				log.debug("Associate in association:"+ tgtMemberId + ", in:" + contextName);
				if(err){
					log.error(err);
				}
				cb(err, member);
			});

		}else{
			//var memberPop = {$pop:{"associates.sorted":srcMemberId,"associates.pending":srcMemberId,"associates.unsorted":srcMemberId}};
			var memberPop = {$pop:{"associates.pending":srcMemberId,"associates.unsorted":srcMemberId,"associates.sorted":srcMemberId}};
			log.debug(" _upsertAssociationsToContext,3");
			collection.findAndModify(member, [["_id",1]], memberPop , {safe:false, "new":true}, function(err, origDoc){
				log.debug("Dissociate in association:"+ tgtMemberId + ", in:" + contextName);
				//console.dir(memberPop);
				//console.dir(origDoc);
				if(err){
					log.error(err);
				}
				if(!origDoc || !origDoc.associates){
					var err = new Error("Associate axis has no members to dissociates ");
					log.debug(err.message);
					log.error(err.message);
					cb(err, origDoc);
				}else if(origDoc.associates.unsorted.length==0){
					//Clean up empty axis
					collection.remove({_id:origDoc._id},{safe:false}, function(err, origDoc){
						if(err){
							log.error(err);
						}
						log.debug(" _upsertAssociationsToContext, remove 2");
						cb(err, origDoc);
					});
				}else{
					cb(err, origDoc);

				}
			});
		}
	});
};

function _upsertConceptsToContext(cSpace, concepts, cb) {
	log.debug(" _upsertConceptsToContext," + JSON.stringify(concepts));
    var contextName = concepts.name;
	cSpace.db.collection(contextName, function(err, collection) {
		if(err){
    		cb(err, concepts);
		}

		async.forEach(concepts.members, function(member, cbEach){
            var conceptId = cSpace.getMemberId(member, concepts);
            var memberKey = conceptId== null? {name:member.name} : {_id:conceptId, name:member.name};
            var memberProxy = {attributes:member.attributes || {}, properties:member.properties || {}};

            log.debug(" _upsertConceptsToContext each," + memberKey.name + ", id:" + (memberKey._id || "Server generated") + ", attributes:" + JSON.stringify(memberProxy.attributes));
            collection.update(memberKey, {$set:memberProxy}, {upsert:true, safe:false, "new":true}, function(err,doc){
                log.debug("Upserted concept:"+ memberKey.name + " in:" + contextName + " _id:" + conceptId);
                member._id = conceptId;
                //console.dir()
                cbEach(err,member);

            });
        },function(err){
            cb(null, concepts);
		});
     });
};

//Takes the members and upserts them
//new tokenResolvers are applied if they've changed
ConceptSpace.prototype.addConcept = function(concepts, cb) {
	_upsertConceptsToContext(this, concepts, function(err, concepts){
		if(!err){
			log.debug("Updated concepts in context:"+ concepts.name);
		}
		cb(err, concepts);
	});
};

//Takes the members and upserts them
//new tokenResolvers are applied if they've changed
ConceptSpace.prototype.addMember = function(contextName, member, cb) {
	//console.dir(member);
	var concept = {name:contextName, members:[member]};
	this.addConcept(concept, function(err, concepts){
		if(!err){
			log.debug("Updated member [" + member.name + "] of context:"+ contextName);
			//console.dir(concept);
		}
		cb(err, concepts);
	});
};

//Associations are a container of token as _id with a tag object of
//{_id:%token%, associates:[{type:'%assocTypeId%',sorted:[%token%,%token%], pending:[%token%,%token%],unsorted:[%token%,%token%]}, {type:'%assocTypeId2%',sorted:[%token%,%token%], unsorted:[%token%,%token%]}}
ConceptSpace.prototype.adjustAssociations = function(srcContextId, srcMemberId, axisId, tgtContextId, tgtMemberId, isAssociate, cb) {
	log.debug("adjustAssociations:" + srcContextId + ", " + srcMemberId + ", " + axisId + ", " + tgtContextId + ", " + tgtMemberId + ", " + isAssociate);
	var assocContextName = this.getConjoinedName(srcContextId, tgtContextId);
	var crossContextName = this.getConjoinedName(tgtContextId, srcContextId);
	var crossAxisId = this.getCrossAxisId(axisId);
	var self=this;
	_upsertAssociationsToContext(this, assocContextName, srcMemberId, axisId, tgtMemberId, isAssociate, function(err, association){
		if(!err){
			log.debug("Adjusted association in context:"+ assocContextName);
			_upsertAssociationsToContext(self, crossContextName, tgtMemberId, crossAxisId, srcMemberId, isAssociate, function(err, association){
				if(!err){
					log.debug("Adjusted cross association in context:"+ crossContextName);
                }
				cb(err, association);
			});
		}else{
			cb(err, association);
		}
	});
};

/*
var manyMemberDualAxes = {name:"Model", attributes:{}, members:[{name:'A4', attributes:{doors:4}
	, associations:[{axis:['madeBy','makes'], associate:[{name:"Manufacturer", members:[{name:'Audi'}]}], dissociate:[]}
					,{axis:['has'], associate:[{name:"Manufacturer", members:[{name:'Audi'}]}]}
]}]};

//{axis:['madeBy','makes'], associate:[{name:"Manufacturer", members:[{name:'Audi'}]
									, {name:"Company", members:[{name:'BIG Corp.'}]
						, dissociate:[{name:"Company", members:[{name:'Prev small Corp.'}]}
// ,{axis:['builtIn'], associate:[{name:"Year", members:[{name:'1999'},{name:'2000'},{name:'2001'}]}

	// Associates token is resolved if necessary
*/
ConceptSpace.prototype.adjustAssociationsOnAxis = function(contextId, memberId, axesMembers, axis, cb) {
	var self = this;
	var axisId = !Array.isArray(axesMembers) ? axesMembers._id : axesMembers[0]._id;

	//Create association array
	// Associates token is resolved if necessary
	async.forEach(axis.associate, function(rawConcept, cbEach){
		// Associates token is resolved if necessary
		self.adjustConcepts(rawConcept, function(err, concept){
			async.forEach(rawConcept.members, function(member, cbEachIn){
				self.associate(contextId, memberId, axisId, rawConcept._id, member._id, function(err, associationProxy){
					cbEachIn(err, associationProxy);
				});
			}, function(err){
				cbEach(err);
			});
		});
	}, function(err){
		var rawConcept = axis.dissociate;
		if(!rawConcept){
			cb(err, axis);
 		}else{
			async.forEach(rawConcept.members, function(member, cbEach){
				if(!associateItem._id){
					self.db.collections(rawConcept.name).find(member.name).toArray(function(err, associateItem){
						if(!err){
							self.dissociate(contextId, memberId, axisId, rawConcept._id, member._id, function(err, associationProxy){
								cbEach(err, associationProxy);
							});
						}
					});
				}else{
					self.dissociate(contextId, memberId, axisId, rawConcept._id, member._id, function(err, associationProxy){
						cbEach(err, associationProxy);
					});
				}
			}, function(err){
				cb(err, axis);
			});
		}
	});
};

// Adds or modifies concept items to the database
ConceptSpace.prototype.adjustConcepts = function(concepts, cb) {
	// Assigns or uses resolver.
	var self = this;
	//console.log(" -------------- cb 1");

	//console.dir(concepts);
	this.registerContext(concepts, function(err, contextProxy){
		if(!concepts.members){
			log.error("Concept missing required members:" + concepts.name);
			if(cb){
				cb(err, concepts);
			}
		}

		async.forEachSeries(concepts.members, function(rawMember, cbEach){
			// Upsert into DB if necessary
              self.addMember(contextProxy.name, rawMember, function(err, memberProxy){
				// Gathering tokens/ids
				var associating = [];
				if(rawMember.associations){
 					var taggers = [];
 					var crossAssociates = [];
 					for(var iassoc=0; iassoc < rawMember.associations.length; iassoc++){
 						var assocs = rawMember.associations[iassoc].associate;
 						for(var iass=0; iass < assocs.length; iass++){
 							crossAssociates[assocs[iass].name] = assocs[iass];
 	 					}
 					}

					for( var name  in crossAssociates){
						var crossAssoc = crossAssociates[name];
						//console.dir("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~cross associate");
 						//console.dir(crossAssoc);
 						self.registerContext(crossAssoc, function(err, context){
 	 						var assocContextName = self.getConjoinedName(contextProxy._id, context._id);
 	 						var crossContextName = self.getConjoinedName(context._id, contextProxy._id);
 	 						var assocContext = {name:assocContextName, properties:{index:[["memberId", 1],[  "type", 1]], indexOptions:{ unique: true}}};
 	 						var crossContext = {name:crossContextName, properties:{index:[["memberId", 1],[  "type", 1]], indexOptions:{ unique: true}}};
 	 						self.registerContext(assocContext);
                            self.extendTraversalRoutes(contextProxy._id, context._id);
 	 						self.registerContext(crossContext);
                            self.extendTraversalRoutes(context._id, contextProxy._id);
                         });
 					}

 					async.forEachSeries(rawMember.associations, function(rawAxes, cbEachIn){
						// Creates and registers associations if necessary. Adds tagId to the object
						self.registerAxis(rawAxes, function(err, axesMembers){
							//console.log("##### axis");
							//console.dir(rawAxes);
							//console.dir(axesMembers);
 							self.adjustAssociationsOnAxis(contextProxy._id, rawMember._id, axesMembers, rawAxes, function(err, association){
 								cbEachIn();
 							});
						});

					}, function(err){
						cbEach(err, concepts);
					});


 				}else if(cbEach){
 					cbEach(err, concepts);
 				}
			});
		},function(err){
           if(cb)cb(err,concepts);
		});
	});
};

//Creates a unique identity for the context
ConceptSpace.prototype.assignContextId = function(context) {
	if(!this._contextRegistry[context.name]){
		context._id = ++this.contextRegistryOffset;
		this._contextRegistry[context.name] = context;
		this._contextRegistry[context._id] = context;
	}
	//console.log(" ++++ Assigned ContextId: "  + context.name + " " + context._id);
};


//Creates a unique identity of the context
//{_id:%token%, associates:[{type:'%assocTypeId%',sorted:[%token%,%token%], pending:[%token%,%token%],unsorted:[%token%,%token%]}, {type:'%assocTypeId2%',sorted:[%token%,%token%], unsorted:[%token%,%token%]}}
ConceptSpace.prototype.associate = function(srcContextId, srcMemberId, axisId, tgtContextId, tgtMemberId, cb) {
	//console.log(srcContextId + ", "+ srcMemberId + ", "+ axisId + ", "+ tgtContextId + ", "+ tgtMemberId)
	this.adjustAssociations(srcContextId, srcMemberId, axisId, tgtContextId, tgtMemberId, true, function(err, association){
		if(cb){
			cb(err,association);
		}
	});
};

ConceptSpace.prototype.dissociate = function(srcContextId, srcMemberId, axisId, tgtContextId, tgtMemberId, cb) {
	this.adjustAssociations(srcContextId, srcMemberId, axisId, tgtContextId, tgtMemberId, false, function(err, association){
		if(cb){
			cb(err,association);
		}
	});
};


//Creates a unique identity of the context
ConceptSpace.prototype.getConjoinedName = function(source, target) {
	log.debug(JSON.stringify(source) + " source, target " + JSON.stringify(target));
	return source.toString().trim() + "_" + target.toString().trim();
};

//Finds a cross Id for the directional axis
ConceptSpace.prototype.getCrossAxisId = function(axisId) {
	//console.log(" axis asked: " + axisId);
	//console.dir(this._axisRegistry[axisId]);
	// If there is no registered axis then presume non-directional.
	return !this._axisRegistry[axisId] ? axisId : this._axisRegistry[axisId].cross._id;
};

//The id of the context to context map
ConceptSpace.prototype.getIntersectionContextId = function(sourceContextName, targetContextName) {
	//console.log(sourceContextName + " sourceContextName, targetContextName " + targetContextName);
	var contextAssocName = this.getConjoinedName(sourceContextName , targetContextName);
	if(!this._associationRegistry[contextAssocName]){
		//Use a hashing algorithm or a token provider
		var mapId = ++this.associationMapsOffset;
		this._associationRegistry[contextAssocName] = {_id:mapId.toString(), name:contextName};
		this.addMember(this.associationMapsName, this._associationRegistry[contextAssocName]);
	}
	return this._associationRegistry[contextAssocName]._id;
};

ConceptSpace.initialMemberID = 1;
//Creates a unique identity of the context
ConceptSpace.prototype.getMemberId = function(member, context) {
	if(member._id){
		return member._id;
	}

	var name = member.name;
	if(!Array.isArray(name)){
		if(typeof name  === "number" ){
			return name.toString();
		}

		if(name instanceof Date ){
			return Date.parse(name).toString();
		};
	}

    var registeredContext = this._contextRegistry[context.name];
    if(!registeredContext.members){
        registeredContext.members = [];
        registeredContext.memberCount = 0;

    }
	//TODO: Use redis as KVP store
    if(!registeredContext.members[name]){
        registeredContext.members[name] = ++registeredContext.memberCount; //new ObjectID();
    }
    return registeredContext.members[name]
};


//Creates a unique identities for axes
ConceptSpace.prototype.getPossibleAxes = function(axisNamePairs) {
	var axes = [];
	var axisNames = [];
	log.debug("Possible axis for:" + axisNamePairs.join(","));
	if(axisNamePairs.length==2){
		axisNames.push(this.getConjoinedName(axisNamePairs[0] , axisNamePairs[1]));
		axisNames.push(this.getConjoinedName(axisNamePairs[1] , axisNamePairs[0]));
	}else if(axisNamePairs.length==1){
		axisNames.push(axisNamePairs[0]);
	}else{
		throw new Error("Invalid set of axis names:" + axisNamePairs);
	}

	for(var iaxis=0; iaxis < axisNames.length; iaxis++){
		axes.push({_id:this.getPossibleAxisId(axisNames[iaxis]), name:axisNames[iaxis], attributes:{axis:axisNamePairs}});
	}
	//console.dir(axes);
	return axes;
};

//Creates a unique identities for axes
ConceptSpace.prototype.getPossibleAxisId = function(axisName) {
    log.debug("-getPossibleAxisId:" + [].splice.call(arguments,0).join(","));
    //console.log("axisName: " + axisName);
	if(!this._axisRegistry[axisName.trim()]){
		return ++this.axisTypeOffset;
	}
	return this._axisRegistry[axisName.trim()]._id;
};

//for a source plus destination context we need an array of context, axis objects
ConceptSpace.prototype.getTraversalPath = function(contextName, crossContextName) {
    log.debug("-getTraversalPath:" + [].splice.call(arguments,0).join(","));
	var traversalPath = this._traversalRoutes[contextName + "_" + crossContextName];
	return traversalPath || [{name:contextName, type:null}, {name:crossContextName, type:null}];
};

//Uses the 'type' property of the argument to upsert the axis
ConceptSpace.prototype.registerAxis = function(axes, cb) {
    log.debug("-registerAxis:" + [].splice.call(arguments,0).join(","));
    var axisName = axes.axis.length == 2 ? axes.axis.join("_") : axes.axis[0];
	if(!this._axisRegistry[axisName]){
		var axesMembers = this.getPossibleAxes(axes.axis);
		var axisConcept = {name:this.axisRegistryName, members: axesMembers, properties:{index:[["memberId", 1, "type", 1]], indexOptions:{ unique: true}}};

		var self =this;
		this.addConcept(axisConcept, function(err, axisConcept){
	        if (!err) {
				var axis = axisConcept.members[0];
				log.debug("Registered axis:"+ axis.name + ",_id:" + axis._id);
				if(axisConcept.members.length==2){
					var crossAxis = axisConcept.members[1];
					log.debug("Registered cross axis:"+ crossAxis.name + ",_id:" + crossAxis._id);
					axis.cross = crossAxis;
					crossAxis.cross = axis;

                    self._axisRegistry[axis._id] = self._axisRegistry[axis.name] = axis;
                    self._axisRegistry[crossAxis._id] = self._axisRegistry[crossAxis.name] = crossAxis;
				}else{
					axis.cross = axis;
                    self._axisRegistry[axis._id] = self._axisRegistry[axis.name] = axis;
				}
	        }else{
	        	log.error(err);
	        }
            cb(err, axesMembers);
		});
	}else{
		cb(null, this._axisRegistry[axisName]);
	}
};

//Take the context property and check the registry. Add if necessary
ConceptSpace.prototype.registerContext = function(context, cb) {
	var contextName = context.name;

	if(!this._contextRegistry[contextName]){
		var contextProxy = {name:contextName, attributes:(context.attributes || null), properties:(context.properties|| null)};
		this.assignContextId(contextProxy);
		var self = this;
		async.series([
		    function(cbSeries){
		    	self.db.createCollection(contextName, function(err, collection) {
	    			log.debug("Creating collection: "+ contextName + ",memberId:" + contextProxy._id + " err:" + err);
		    		if(err){
		    			log.error("Creating collection error:" + err);
			    		cbSeries(null, collection);
		    		} else{
			    		//TODO: Index to be based on context type.
			    		var indexOn = context.properties && context.properties.index ? context.properties.index : {};
			    		var indexOptions = context.properties && context.properties.indexOptions ? context.properties.indexOptions : {unique:true};
			    		collection.ensureIndex(indexOn, indexOptions, function(err, indexName) {
				    		if(err){
								log.error("Ensuring index collection: "+ contextName + ",_id:" + contextId + " err:" + err);
				    		}
				    		cbSeries(err, collection);
				    	});
		    		}
		    	});
		    },
		    function(cbSeries){
		        self.addMember(self.contextRegistryName, contextProxy, function(err, memberProxy){
			        if (!err) {
						log.debug("Registered context: "+ contextName + ",_id:" + contextProxy._id);
						memberProxy._id = context._id = contextProxy._id;
			        }else{
			        	log.error("Registered context failed:" + err);
			        }
			        cbSeries(err, contextProxy);
		        });
		    }],
			function(err, results){
				if(cb)cb(err, contextProxy);
			});
	}else{
		context._id = this._contextRegistry[contextName]._id;
		if(cb)cb(null, context);
	}
};

// equationPath syntax {$or:[{context:"Manufacturers", members:[]}],"$or":{group:[{context:"Countries", members:[]}]}}
// equationPath syntax {group:{context:"Manufacturers", ids:[]}
// { $or : [ {context:"Manufacturers", members:[], where:{}} , { $and : [ {context:"Countries", members:[]}, {context:"Insurers", members:[]} ] }  ] }
ConceptSpace.prototype.evaluate = function(context, contextExpression, relativeConcepts, associateLists, cb) {
	var associateLists = associateLists || [];
    var self = this;

    for(var ops in contextExpression){
		var contextList = contextExpression[ops];
        async.forEachSeries(contextList, function(ctxtOrExpr, cbEach){
        	var partialResult;
			if(ctxtOrExpr.context){
				self.intersect(context, ctxtOrExpr, context.where, function(intersectionSteps){
                    partialResult = intersectionSteps[intersectionSteps.length-1].ids;
                    cbEach();
                });
			}else{
                self.evaluate(context, ctxtOrExpr, relativeConcepts, associateLists, function(associateLists){
                    associateLists = associateLists;
                    cbEach();
                });
                partialResult = this.evaluate(context,ctxtOrExpr);
			}
		},function(){
            switch(ops){
                case $or:
                    associateLists = partialResult.union(associateLists);
                case $and:
                    associateLists = partialResult.intersect(associateLists);
                case $nor:
                    associateLists = associateLists.subtract(partialResult);
                case $xor:
                    associateLists = partialResult.union(associateLists).remove(partialResult.intersect(associateLists));
                default:
                    log.error("Unexpected operation:" + ops);
            }
            cb(associateLists);
        })

	}

	// Apply policyContexts
	// this.intersect(results, policy);
	if(relativeConcepts){
		return this.resolveConcepts(lists, relativeConcepts);
	}

	return associateLists;
};

// Uses the 'type' property of the argument to upsert the axis
ConceptSpace.prototype.intersect = function(context, crossConcept, filter, cb) {
	var self = this;
	var intersections = [];
	var memberIds =[];
	var memberNames = [];
 	//console.log("****** Cross context");
 	//console.dir(crossConcept);
	// Gather all the _ids or names if the _ids are missing
	if(crossConcept.members){
		for (var imem=0; imem < crossConcept.members.length; imem++){
			var member = crossConcept.members[imem];
			if(member._id){
				memberIds.push(member._id);
			}
			else if(member.name){
				memberNames.push(member.name);
			}
		};
		intersections.push({ids:memberIds, names:memberNames, contextName:crossConcept.name});
	}

	var contextPath = this.getTraversalPath(crossConcept.name, context.name);
	//console.log("****** Cross context memberIds");
	//console.dir(memberIds);
	var pathStep = 0;

	var assocMapName = crossConcept.name;
	var assocMapType = crossConcept.type;
	// Get the members of an entire or members of a context that
	// have at least one associate on the path

	async.series([function(cbSer){
		if(memberNames.length > 0 || filter){
			var bsonFind = filter? filter : {};

			// Filter by the axis if there is one
			if(assocMapType){
				bsonFind["associates.type"] = assocMapType;
			}

			// Only use member IDs when a filter is being used
			if(memberIds.length && filter){
				bsonFind._id = memberIds[0];//{$in:memberIds};
			}

			if(memberNames.length){
				bsonFind.$or = [];
				for(var iname=0; iname< memberNames.length; iname++){
					 bsonFind.$or.push({name:memberNames[iname]});
				}

				//console.log("****** Cross context find" + JSON.stringify(bsonFind)  + " in "+  assocMapName);

				self.db.collection(assocMapName).find(bsonFind,["_id"]).toArray( function(err, members){
					//console.log("Cross context in member name resolve.");
					//console.dir(members);
					if(err){
						log.error(err);
					}
					for(var imem=0; imem<members.length; imem++){
						memberIds.push(members[imem]._id);
					}
					// align id with tokens found to create association pairs
					intersections[0].ids.concat(memberIds);
					cbSer();
				});
			}
		}else{
			cbSer();
		}
	}],function(){
		//console.log("Member ids:" );
		//console.dir(intersections);

		async.forEachSeries(contextPath, function(node, cbEachOut){
			//console.log("Cross context:" + node.name);
			if(pathStep < contextPath.length-1){
				var sourceId = self._contextRegistry[node.name]._id;
				var targetId = self._contextRegistry[contextPath[pathStep+1].name]._id;
				assocMapName = self.getConjoinedName(sourceId, targetId);
				assocMapType = node.type;

				// Get the members of an entire or members of a context that
				// have at least one associate on the path
				var bsonFind = {memberId:{$in:memberIds}};
				//console.log("Cross context find " + JSON.stringify(bsonFind)  + " in "+  assocMapName);
				self.db.collection(assocMapName).find(bsonFind).toArray(function(err, assocsFound){

					//console.log("-------- Cross context");
	 				//console.dir(assocsFound);
					if(err){
						log.error(err);
					}

					// align id with tokens found to create association pairs
					var associations = [];
					memberIds = [];
					async.forEach(assocsFound, function(assocItem, cbEach){
						if(err){
							log.error(err);
						}
						var associates = assocItem.associates;
						var sortedTokens = associates.sorted;
						if(associates.pending.length > 0){
							// Sort pending then merge sorted
							sortedTokens = mergeSortedUnique(sortedTokens, associates.pending.sort());
							_upsertAssociationOptimization(self, assocMapName, assocItem._id, assocItem.type, sortedTokens, function(err){
								cbEach(err);
							});
						}
						memberIds = mergeSortedUnique(memberIds,sortedTokens);
						cbEach();
					});
					pathStep++;
					intersections.push({ids:memberIds, contextName:self._contextRegistry[assocMapName.split("_")[1]].name});
					cbEachOut(null, intersections);
				});
			}else{
				cbEachOut(null);
			}
		},function(){
			//console.log("=== done intersecting");
			cb(null, intersections);						
		});
	});
};


module.exports = ConceptSpace;

function mergeSortedUnique(left,right)
{
	var result = new Array();
	var lastItem  = "";
	while((left.length > 0) && (right.length > 0))
	{
		lastItem = left[0] <= right[0] ? left.shift() :right.shift();
		if(result.length == 0 || result[result.length-1] != lastItem){
			result.push(lastItem);
		}
	}
	while(left.length > 0)
		result.push(left.shift());
	while(right.length > 0)
		result.push(right.shift());
	return result;
}

function TraversalNode(contextName, typeNames){
	this.name = contextName;
	this.type = typeNames || [];
}

function Association(memberId, associatesList){
	this._id = memberId;
	this.associates = associatesList;
}

function AssociateAxis(typeId){
	this.type = typeId;
	this.sorted = [];
	this.pending = [];
	this.unsorted = [];
	
	this.add = function(memberId){
		this.pending.push(memberId);	
		this.unsorted.push(memberId);	
	};

	this.get = function(sorted){
		if(sorted){
			this.sorted = this.sorted.union(this.pending.sort());
			this.pending = [];
		}
		return this;	
	};
}

//equationPath syntax {group:[{context:"Manufacturers", members:[]}],"$or":{group:[{context:"Countries", members:[]}]}}
//equationPath syntax {group:{context:"Manufacturers", ids:[]}
	
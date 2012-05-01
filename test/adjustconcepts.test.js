var vows = require('vows');
var ensurers = require('./vows.helpers.js');
var ctxtManufacturer = {name:"Manufacturer", attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};
ctxtManufacturer.members = [{name:'Acura'}];
var acura = {name:"Manufacturer", members :[{name:'Acura'}], attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};

var integra = {name:'Integra', associations:[{axis:['madeBy','makes'], associate:[acura]}]};
var legend 	= {name:'Legend', associations:[{axis:['madeBy','makes'], associate:[acura]}]};
var vigor 	= {name:'Vigor', associations:[{axis:['madeBy','makes'], associate:[acura]}]};

ctxtManufacturer.members = [{name:'Audi'}];
var audi = {name:"Manufacturer", members :[{name:'Audi'}], attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};

var a5 	= {name:'A5', associations:[{axis:['madeBy','makes'], associate:[audi]}]};
var manyMemberSingleAxis = {name:"Model", attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}, members:[integra,legend,vigor,a5
	, {name:'A4', attributes:{doors:4}, associations:[{axis:['madeBy','makes'], associate:[audi]}
]}]};

var manyMemberDualAxes = {name:"Model", attributes:{},properties:{index:[["name", 1]], indexOptions:{ unique: true}}, members:[vigor,a5
	, {name:'A4', attributes:{doors:4}, associations:[{axis:['madeBy','makes'], associate:[audi]} //, dissociate:[]
					,{axis:['delivered'], associate:[{name:"Year", members:[{name:'2001'},{name:'2002'},{name:'2003'},{name:'2004'}]}]}
]}]};

var singleMemberSingleAxis = {name:"Model", properties:{index:[["name", 1]], indexOptions:{ unique: true}}, members:[a5]};
var twoMembersSingleAxis = {name:"Model", properties:{index:[["name", 1]], indexOptions:{ unique: true}}, members:[integra, a5]};
var singleMemberDualAxes = {name:"Model", attributes:{},properties:{index:[["name", 1]], indexOptions:{ unique: true}}, members:[integra, a5
	,{name:'A4', attributes:{doors:4}, associations:[{axis:['madeBy','makes'], associate:[audi]} //, dissociate:[]
					,{axis:['delivered'], associate:[{name:"Year", members:[{name:'2001'}]}]}
]}]};


vows.describe('test adjustConcepts').addBatch( 
		ensurers.ensureEmptyOpenDatabase()
												).addBatch( 
 		ensurers.ensureConceptsAdjusted(
 					singleMemberSingleAxis
//				, "Single member single axis:")).addBatch(
//		ensurers.ensureConceptsAdjusted(
//					singleMemberDualAxes
//				, "Single member dual axis:")).addBatch(
//		ensurers.ensureConceptsAdjusted(
//					twoMembersSingleAxis
 //				, "adjust two member concept:")).addBatch(
//		ensurers.ensureConceptsAdjusted(
//					manyMemberDualAxes
// 				, "adjust many members on two axes:")).addBatch(
 //  		ensurers.ensureConceptsAdjusted(
 //	 				manyMemberSingleAxis
					, "adjust many members, single axis:", true)).run();


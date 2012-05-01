var vows = require('vows');
var ensurers = require('./vows.helpers.js');

var manufacturers = {name:"Manufacturer", members:[{name:'Acura'}, {name:'Audi'}]};
var acura = {name:"Manufacturer", members:[{name:'Acura'}], attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};

var integra = {name:'Integra', associations:[{axis:['madeBy','makes'], associate:[acura]}]};
var legend 	= {name:'Legend', associations:[{axis:['madeBy','makes'], associate:[acura]}]};
var vigor 	= {name:'Vigor', associations:[{axis:['madeBy','makes'], associate:[acura]}]};

var audi    = {name:"Manufacturer", members:[{name:'Audi'}], attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};
var years = {name:"Year", members:[{name:'2001'},{name:'2002'},{name:'2003'},{name:'2004'}]};
var a5 	    = {name:'A5', associations:[{axis:['madeBy','makes'], associate:[audi]}]};
var a4      = {name:'A4', attributes:{doors:4}, associations:[{axis:['madeBy','makes'], associate:[audi]} ,{axis:['delivered'], associate:[years]}]};

var ctxtModel 		= {name:"Model", attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};
ctxtModel.members = [integra,legend,vigor,a5, a4];

var ctxtManufacturer = {name:"Manufacturer"};
var audiA5	    = {name:"Model", members:[{name:'A5'}]};
var year2001	= {name:"Year", members:[{name:'2001'}]};


//Simple test
//ctxtModel.members = [vigor,a5];

vows.describe('test adjustConcepts').addBatch(
    ensurers.ensureEmptyOpenDatabase()).addBatch(
    ensurers.ensureConceptsAdjusted(
        ctxtModel
        , "Adjust many members on two axes:")).addBatch(
    ensurers.ensureEvaluating(
        ctxtManufacturer,
        audiA5,
        "",
        [audi.members[0]]
        , "Intersection of A5 and manufacturer:")).addBatch(
    ensurers.ensureEvaluating(
        ctxtModel,
        audi,
        "",
        [a5, a4]
        , "Intersection of Audi and models:", true)).run();


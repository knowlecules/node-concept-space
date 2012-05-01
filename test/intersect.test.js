var vows = require('vows');
var ensurers = require('./vows.helpers.js');

var years2003_2007   = {name:"Year", members:[{name:'2003'},{name:'2004'},{name:'2005'},{name:'2006'},{name:'2007'}]};
var years2004_2005   = {name:"Year", members:[{name:'2004'},{name:'2005'}]};
var years2001_2004   = {name:"Year", members:[{name:'2001'},{name:'2002'},{name:'2003'},{name:'2004'}]};
var years1999_2000   = {name:"Year", members:[{name:'1999'},{name:'2000'}]};

var germany     = {name:"Country", members:[{name:'Germany'}]};
var audiMaker   = {name:"Audi", associations:[{axis:['origin','hasMaker'], associate:[germany]}]};
var audi        = {name:"Manufacturer", members:[audiMaker], attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};

var japan       = {name:"Country", members:[{name:'Japan'}]};
var acuraMaker  = {name:"Acura", associations:[{axis:['origin','hasMaker'], associate:[japan]}]};
var acura       = {name:"Manufacturer", members:[acuraMaker], attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};

var a5 	    = {name:'A5', associations:[{axis:['madeBy','makes'], associate:[audi]},{axis:['delivered'], associate:[years2004_2005]}]};
var a4      = {name:'A4', attributes:{doors:4}, associations:[{axis:['madeBy','makes'], associate:[audi]} ,{axis:['delivered'], associate:[years2001_2004]}]};

var integra = {name:'Integra', associations:[{axis:['madeBy','makes'], associate:[acura]},{axis:['delivered'], associate:[years2003_2007]}]};
var legend 	= {name:'Legend', associations:[{axis:['madeBy','makes'], associate:[acura]},{axis:['delivered'], associate:[years1999_2000]}]};
var vigor 	= {name:'Vigor', associations:[{axis:['madeBy','makes'], associate:[acura]}]};

var ctxtModel 		= {name:"Model", attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};
ctxtModel.members = [integra,legend,vigor,a5, a4];

var ctxtManufacturer = {name:"Manufacturer"};
var ctxtYear	    = {name:"Year"};

var audiA5	    = {name:"Model", members:[{name:'A5'}]};
var year2001	= {name:"Year", members:[{name:'2001'}]};


//Simple test
//ctxtModel.members = [vigor,a5];

vows.describe('test adjustConcepts').addBatch(
		ensurers.ensureEmptyOpenDatabase()).addBatch(
		ensurers.ensureConceptsAdjusted(
					ctxtModel
				, "Adjust many members on two axes:")).addBatch( 
		ensurers.ensureIntersecting(
					ctxtManufacturer,
					audiA5,
					"",
					[audi.members[0]]
                , "Intersection of A5 and Manufacturer:")).addBatch(
        ensurers.ensureIntersecting(
                    ctxtModel,
                    audi,
                    "",
                    [a5, a4]
                , "Intersection of Audi and Models:")).addBatch(
        ensurers.ensureIntersecting(
                    ctxtModel,
                    year2001,
                    "",
                    [a4]
                , "Intersection of 2001 and Models:")).addBatch(
        ensurers.ensureIntersecting(
                    ctxtManufacturer,
                    year2001,
                    "",
                    [audi.members[0]]
                , "Intersection by double hop of 2001 and Manufacturers:")).addBatch(
        ensurers.ensureIntersecting(
                    ctxtYear,
                    audi,
                    "",
                    years2001_2004.members.concat({name:'2005'})
                , "Intersection by double hop of 2001 and Manufacturers:")).addBatch(
        ensurers.ensureIntersecting(
                    ctxtYear,
                    germany,
                    "",
                    years2001_2004.members.concat({name:'2005'})
                , "Intersection by triple hop of Germany and Years:", true)).run();


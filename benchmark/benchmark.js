
var conceptSpace = require('../lib/conceptspace.js')('concept-space-test');
var async = require('async');

var times = 1000
  , n1 = n2 = times;
/* Factor for distinct tests
8 x insert per thread
2 x updates per thread
3.4 seconds for 1000*8*4 or 32000 inserts
            plus 1000*2*4 or 8000 updates
*/

var concept1 = {name:"Context 1", properties:{index:[["name", 1]], indexOptions:{ unique: true}}};
var concept2 = {name:"Context 2", properties:{index:[["name", 1]], indexOptions:{ unique: true}}};
var begin;

conceptSpace.open(
function(){
	
	async.series([function(cb){
        conceptSpace.db.dropDatabase(
            function(){
            var start1 = new Date();
            begin = new Date();

            console.log('times: %d', times);
			var logged =false;
			while (n1--) {	
				concept1.members = [{name:n1, attributes:{ type:'Q'}}];
				conceptSpace.addConcept(concept1, function(){
					if(n1<=0 && !logged){
						logged=true;
						console.log('individual members: %dms', new Date - start1);
					}
				});
			}
	
			concept2.members = [];
			while (n2--) {	
				concept2.members.push({name:n2, attributes:{ type:'A'}});
			}
			var start2 = new Date();
			conceptSpace.addConcept(concept2, function(){
				console.log('complete context: %dms', new Date - start2);			
			});
			
			n2 = times;
			concept2.members = [];
			while (n2--) {	
				concept2.members.push({name:n2, attributes:{ type:'B'}});
			}
			start2 = new Date();
			conceptSpace.addConcept(concept2, function(){
				console.log('update complete context: %dms', new Date - start2);
				cb();
			});
        });
	},function(cb){

		var start1 = new Date();

        var logged =false;
		var n1 = times;

        while (n1--) {
            var manufName =  "Manuf_" + n1;
            var modelName =  "Model_" + n1;
            var ctxtManuf = {name:"Manufacturer", members :[{name:manufName}], attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};

            var modelConcept = {name:"Model", attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}
                , members:[{name:modelName, associations:[{axis:['madeBy','makes'], associate:[ctxtManuf]}]}]};

            conceptSpace.adjustConcepts(modelConcept, function(){
                if(n1<=0 && !logged){
                    logged=true;
                    console.log('Associating concepts: %dms', new Date - start1);
                }
            });
        }

        var start1 = new Date();

        var logged =false;
        var n1 = times;

        while (n1--) {
            var manufName =  "Manuf2_" + parseInt(n1/100,10);
            var modelName =  "Model2_" + n1;
            var ctxtManuf = {name:"Manufacturer_2", members :[{name:manufName}], attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};

            var modelConcept = {name:"Model_2", attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}
                , members:[{name:modelName, associations:[{axis:['madeBy','makes'], associate:[ctxtManuf]}]}]};

            conceptSpace.adjustConcepts(modelConcept, function(){
                if(n1<=0 && !logged){
                    logged=true;
                    console.log('Group of 100 assocs: %dms', new Date - start1);
                    cb();
                 }
            });
        }
    },function(){
        console.log('Total elapsed: %dms', new Date - begin);
    }]
	);
});

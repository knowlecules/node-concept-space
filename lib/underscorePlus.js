var _ = require('underscore')._;

_.prototype.mergeArrays = function (a, b, unique){
		if(unique){
			return mergeSortedUnique(a,b);
		}
		var c= [];
	    while(a.length && b.length){
	    	while(b[0]<=a[0]) c.push(b.shift());
	        while(a[0]<=b[0]) c.push(a.shift());
	    }
	    if(a.length) c.push(a);
	    else c.push(b);
	    return c;
	};
	
_.prototype.mergeUnique = function(a, b){
	    var c= [];
	    while(a.length && b.length){
	    	if(b[0]==a[0] && c[c.length-1] == a[0])continue;
	    	while(b[0]<=a[0]) c.push(b.shift());
	        while(a[0]<=b[0]) c.push(a.shift());
	    }
	    if(a.length) c.push(a);
	    else c.push(b);
	    return c;
};

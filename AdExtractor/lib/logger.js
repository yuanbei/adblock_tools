var Logger = {
    depth : 0,
    indent : '',

    debug : function(msg)
    {
        console.log(this.indent + msg);
    },

    incDepth : function() {
        this.depth ++;
        this.indent = Array(this.depth + 1).join('  ');
    },

    decDepth : function() {
        this.depth --;
        this.indent = Array(this.depth + 1).join('  ');
    },
};

exports.create = function() { return Object.create(Logger); }
exports.debug = function(msg) { console.log(msg); }


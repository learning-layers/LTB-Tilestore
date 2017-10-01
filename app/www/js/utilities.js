/* 
 * This utility lib is used both in the app and the tilestore. We include it as very first
 * so no dependencies should exist at loading time.
 */

/* the default wrapper/alias for console.logs gives the consoles (with correct file and line number
 * Just after collecting the settings, the debug might be switched off. IN those cases, the deblog is redefined
 * to a skip function
 */
var deblog = console.log.bind(console, 'DEBUG:');

/* We can define per module etc a debug function that is switched on off based on some debugging
 * option that is available there
 */
var devLogFun = function(is_debug){
    return (is_debug) ? deblog : function(){};
};


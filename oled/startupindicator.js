const i2c = require('i2c-bus');
const MCP23017_ADDRESS = 0x27;
const bus = i2c.openSync(1);

// Set all pins of Port A to be outputs (0x00 means all outputs)
bus.writeByteSync(MCP23017_ADDRESS, 0x00, 0x00);  // 0x00 is the address of IODIRA

console.log('Turning on startup indicator LED...');
// Turn on PA7 (0x80 sets the 7th bit, which corresponds to PA7)
bus.writeByteSync(MCP23017_ADDRESS, 0x12, 0x80);  // 0x12 is the address of GPIOA

setTimeout(() => {
    console.log('Turning off startup indicator LED...');
    // Turn off all LEDs on Port A
    bus.writeByteSync(MCP23017_ADDRESS, 0x12, 0x00);  // Write to GPIOA to turn off
}, 70000);  // Adjust the duration as needed

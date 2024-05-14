const i2c = require('i2c-bus');
const MCP23017_ADDRESS = 0x27;
const bus = i2c.openSync(1);

// Add a delay to ensure the system is fully up before executing
setTimeout(() => {
    // Set all pins of Port A to be outputs (0x00 means all outputs)
    bus.writeByteSync(MCP23017_ADDRESS, 0x00, 0x00);  // 0x00 is the address of IODIRA

    console.log('Turning on startup indicator LED...');
    // Turn on PA0 (0x01 sets the 0th bit, which corresponds to PA0)
    bus.writeByteSync(MCP23017_ADDRESS, 0x12, 0x01);  // 0x12 is the address of GPIOA

    setTimeout(() => {
        console.log('Turning off startup indicator LED...');
        // Turn off all LEDs on Port A
        bus.writeByteSync(MCP23017_ADDRESS, 0x12, 0x00);  // Write to GPIOA to turn off

        // Close the I2C bus after turning off the LED
        bus.closeSync();
    }, 70000);  // Adjust the duration as needed
}, 1000);  // Initial delay of 1 second to ensure system stability

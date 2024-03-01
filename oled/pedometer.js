const spiDevice = require('spi-device');
const { exec } = require('child_process');

const adjustSensitivity = (rawValue) => {
  // Map the raw ADC value (0-1023) to the volume range (0-100) within a 360-degree turn
  const volume = Math.round((rawValue / 1023) * 100);

  // Adjust sensitivity to provide a more significant change in volume
  const adjustedVolume = volume * 15; // Increasing the scaling factor to provide more power

  // Ensure volume is within the range 0-100
  return Math.min(Math.max(adjustedVolume, 0), 100);
};

// Function to read from the MCP3008 channel
const readChannel = (channel) => {
  return new Promise((resolve, reject) => {
    const mcp3008 = spiDevice.open(0, 1, { maxSpeedHz: 1350000 }, (err) => {
      if (err) reject(err);

      const message = [{
        sendBuffer: Buffer.from([1, (8 + channel) << 4, 0]),
        receiveBuffer: Buffer.alloc(3),
        byteLength: 3,
        speedHz: 1350000
      }];

      mcp3008.transfer(message, (err, msg) => {
        if (err) {
          reject(err);
        } else {
          const result = msg[0].receiveBuffer;
          const value = ((result[1] & 3) << 8) + result[2];
          resolve(value);
        }
        mcp3008.close((err) => {
          if (err) console.error('Failed to close SPI device', err);
        });
      });
    });
  });
};

// Function to set volume using Volumio
const adjustVolumeWithVolumio = (volume) => {
  exec(`volumio volume ${volume}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`Volume set to ${volume} with Volumio: ${stdout}`);
    if (stderr) console.log(`stderr: ${stderr}`);
  });
};

let lastVolume = -1;
let stableReadings = 0;
const volumeChangeThreshold = 2;
const pollingInterval = 500;
let debounceCounter = 0;

const debounceThreshold = 5;
const confirmationThreshold = 1;

const startPolling = () => {
  const channel = 0;
  setInterval(async () => {
    try {
      const value = await readChannel(channel);
      const adjustedValue = adjustSensitivity(value);
      if (Math.abs(adjustedValue - lastVolume) > volumeChangeThreshold) {
        if (debounceCounter < debounceThreshold) {
          debounceCounter++;
        } else {
          stableReadings++;
          if (stableReadings >= confirmationThreshold) {
            console.log(`Potentiometer Value: ${value}, Adjusting volume to: ${adjustedValue}`);
            adjustVolumeWithVolumio(adjustedValue);
            lastVolume = adjustedValue;
            stableReadings = 0;
            debounceCounter = 0;
          }
        }
      } else {
        stableReadings = 0;
        debounceCounter = 0;
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, pollingInterval);
};

process.stdin.resume();
console.log('Script is running, press CTRL+C to exit');

process.on('SIGINT', () => {
  console.log('Exiting...');
  process.exit();
});

startPolling();

#!/bin/sh

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log file for detailed installation messages
LOG_FILE="install_details.log"

# Function to install Node.js and npm with an audiophile twist
install_node_and_npm() {
    echo -e "${YELLOW}Tuning in to Node.js and npm frequencies...${NC}"
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        echo -e "${GREEN}Node.js and npm are already in harmony.${NC}"
    else
        echo -e "${YELLOW}Node.js or npm not found. Setting up the stage...${NC}"
        sudo apt-get update
        sudo apt-get install -y nodejs npm
        # Encore: Check again after installation
        if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
            echo -e "${GREEN}Node.js and npm have tuned in perfectly.${NC}"
        else
            echo -e "${RED}Encore failed. Node.js and npm are out of tune. Check your package manager or install manually.${NC}"
            exit 1
        fi
    fi
}

# Function to install dependencies for Volumio with a touch of audiophile elegance
install_dep_volumio() {
    if apt-get -qq install build-essential > /dev/null 2>&1; then
        echo -e "${GREEN}Essential building blocks are in place, like a solid vinyl collection.${NC}"
    else
        echo -e "${YELLOW}Missing some vinyl in your collection, attempting a rare find workaround...${NC}"
        if bash Workaround_BuildEssentials.sh > /dev/null 2>> $LOG_FILE; then
            echo -e "${GREEN}...Success! Your collection is now complete.${NC}"
        else
            echo -e "${RED}...No luck, the rare vinyl remains elusive. The OLED display can't be installed without it.${NC}"
            exit 1
        fi
    fi
}

# Start the installation with a bit of flair
echo -e "${GREEN}Quadify's audiophile installation is tuning up...${NC}"
install_node_and_npm

# Main installation script with an audiophile theme
case "$1" in
    'volumio')
        start_time="$(date +"%T")"
        echo "* Setting up the stage for Quadify OLED#2 on Volumio" > $LOG_FILE
        install_dep_volumio
        npm install async i2c-bus pi-spi onoff date-and-time socket.io-client@2.1.1 spi-device &>> $LOG_FILE

        # Setting up the stage for SPI interfacing, like fine-tuning your turntable
        echo "spi-dev" | sudo tee -a /etc/modules > /dev/null
        echo "dtparam=spi=on" | sudo tee -a /boot/userconfig.txt > /dev/null

        # Check for SPI buffer size like checking for the right pressure on your vinyl
        if [ ! -f "/etc/modprobe.d/spidev.conf" ] || ! grep -q 'bufsiz=8192' /etc/modprobe.d/spidev.conf; then
            echo "options spidev bufsiz=8192" | sudo tee -a /etc/modprobe.d/spidev.conf > /dev/null
        fi

        # Setting up the OLED service, like setting up your amplifier
        printf "[Unit]\nDescription=Quadify OLED Display Service\nAfter=volumio.service\n[Service]\nWorkingDirectory=%s\nExecStart=/usr/bin/node %s/index.js volumio\nExecStop=/usr/bin/node %s/off.js\nStandardOutput=null\nType=simple\nUser=volumio\n[Install]\nWantedBy=multi-user.target" "$PWD" "$PWD" "$PWD" | sudo tee /etc/systemd/system/oled.service > /dev/null
        sudo systemctl enable oled > /dev/null 2>> $LOG_FILE

        # Restart the OLED service, like dropping the needle on a fresh record
        sudo systemctl restart oled
        echo -e "${GREEN}The Quadify OLED stage is set, let the music play.${NC}"
        ;;

    # Add similar themed messages and steps for Moode installation...
esac

echo "Installation began at $start_time and concluded at $(date +"%T"). Enjoy the symphony!" >> $LOG_FILE

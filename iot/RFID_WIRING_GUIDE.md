# RFID Reader Wiring Guide for ESP8266

## Components Required

- **ESP8266 NodeMCU** (or Wemos D1 Mini)
- **MFRC522 RFID Reader Module**
- **RFID Cards/Tags** (13.56MHz)
- **LED** (for status indication)
- **Resistor** (220Ω for LED)
- **Breadboard and Jumper Wires**

## Pin Connections

### ESP8266 to MFRC522 RFID Module

| ESP8266 Pin | MFRC522 Pin | Description |
|-------------|-------------|-------------|
| **3.3V** | **VCC** | Power supply (3.3V) |
| **GND** | **GND** | Ground |
| **D4** | **SDA/SS** | SPI Slave Select |
| **D5** | **SCK** | SPI Clock |
| **D7** | **MOSI** | SPI Master Out Slave In |
| **D6** | **MISO** | SPI Master In Slave Out |
| **D3** | **RST** | Reset pin |
| **3.3V** | **IRQ** | Interrupt (not used) |

### ESP8266 to LED

| ESP8266 Pin | LED Component | Description |
|-------------|---------------|-------------|
| **D2** | **Anode (+)** | LED positive terminal |
| **GND** | **Cathode (-)** | LED negative terminal (via 220Ω resistor) |

## Visual Wiring Diagram

```
ESP8266 NodeMCU          MFRC522 RFID Module
┌─────────────────┐      ┌─────────────────┐
│ 3.3V ───────────┼──────┤ VCC             │
│ GND  ───────────┼──────┤ GND             │
│ D4   ───────────┼──────┤ SDA/SS          │
│ D5   ───────────┼──────┤ SCK             │
│ D7   ───────────┼──────┤ MOSI            │
│ D6   ───────────┼──────┤ MISO            │
│ D3   ───────────┼──────┤ RST             │
│ 3.3V ───────────┼──────┤ IRQ             │
└─────────────────┘      └─────────────────┘

ESP8266 NodeMCU          LED Circuit
┌─────────────────┐      ┌─────────────────┐
│ D2   ───────────┼──────┤ LED Anode (+)   │
│                 │      │                 │
│ GND  ───────────┼──────┤ 220Ω Resistor   │
│                 │      │                 │
│                 │      │ LED Cathode (-) │
└─────────────────┘      └─────────────────┘
```

## Step-by-Step Wiring Instructions

### Step 1: Power Connections
1. Connect **3.3V** from ESP8266 to **VCC** on MFRC522
2. Connect **GND** from ESP8266 to **GND** on MFRC522

### Step 2: SPI Communication
1. Connect **D4** (GPIO4) to **SDA/SS** on MFRC522
2. Connect **D5** (GPIO14) to **SCK** on MFRC522
3. Connect **D7** (GPIO13) to **MOSI** on MFRC522
4. Connect **D6** (GPIO12) to **MISO** on MFRC522

### Step 3: Control Pins
1. Connect **D3** (GPIO0) to **RST** on MFRC522
2. Connect **3.3V** to **IRQ** on MFRC522 (optional, not used in code)

### Step 4: Status LED
1. Connect **D2** (GPIO4) to **LED Anode** (+)
2. Connect **220Ω Resistor** between **LED Cathode** (-) and **GND**

## Code Pin Definitions

The code uses these pin definitions:

```cpp
// RFID pins
#define RST_PIN D3    // Reset pin
#define SS_PIN D4     // Slave Select pin
#define LED_PIN D2    // Status LED pin
```

## Troubleshooting

### Common Issues

1. **RFID Not Detected**
   - Check power connections (3.3V, GND)
   - Verify SPI connections (D4, D5, D6, D7)
   - Ensure RST pin is connected to D3

2. **LED Not Working**
   - Check LED polarity (anode to D2, cathode to GND via resistor)
   - Verify resistor value (220Ω)

3. **Serial Monitor Shows No Output**
   - Check USB connection
   - Verify baud rate (115200)
   - Ensure correct COM port selected

4. **WiFi Connection Issues**
   - Check WiFi credentials in code
   - Verify signal strength
   - Check if 2.4GHz network (ESP8266 doesn't support 5GHz)

### Testing Steps

1. **Upload the simple test code first** (`rfid_simple_test.ino`)
2. **Open Serial Monitor** (115200 baud)
3. **Look for startup messages**:
   ```
   === RFID CARD READER TEST ===
   Place RFID card on reader...
   ================================
   ✓ RFID Reader: WORKING
   Ready! Place card on reader...
   ```
4. **Place RFID card on reader**
5. **Check for card detection**:
   ```
   ================================
   CARD DETECTED: A1B2C3D4
   ================================
   ```

## Power Requirements

- **ESP8266**: 3.3V, ~200mA
- **MFRC522**: 3.3V, ~50mA
- **LED**: 3.3V, ~20mA
- **Total**: ~270mA

**Note**: Use a good quality 3.3V power supply or USB power (5V with voltage regulator).

## Safety Notes

- Always power off before making connections
- Double-check connections before powering on
- Use appropriate resistor for LED to prevent damage
- Ensure stable power supply to avoid ESP8266 resets

## Next Steps

Once wiring is complete and simple test works:

1. Test with `rfid_simple_test.ino` first
2. If successful, upload `rfid_firebase.ino`
3. Check Firebase database for data
4. Test with web application

## Additional Resources

- [ESP8266 Pinout Reference](https://randomnerdtutorials.com/esp8266-pinout-reference-gpios/)
- [MFRC522 Datasheet](https://www.nxp.com/docs/en/data-sheet/MFRC522.pdf)
- [Arduino SPI Communication](https://www.arduino.cc/en/reference/SPI)

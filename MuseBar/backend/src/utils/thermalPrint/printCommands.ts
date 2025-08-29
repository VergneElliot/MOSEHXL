/**
 * Print Commands - ESC/POS Command Definitions
 * All thermal printer command constants and utilities
 */

/**
 * ESC/POS Command Constants
 * Standard commands for thermal printer control
 */
export class PrintCommands {
  // Basic Commands
  static readonly ESC = '\x1B';
  static readonly GS = '\x1D';
  static readonly LF = '\x0A';
  static readonly CR = '\x0D';
  
  // Printer Control
  static readonly INIT = PrintCommands.ESC + '@'; // Initialize printer
  static readonly CUT = PrintCommands.GS + 'V\x00'; // Cut paper
  static readonly BEEP = PrintCommands.ESC + 'B\x05\x05'; // Beep
  
  // Text Formatting
  static readonly BOLD_ON = PrintCommands.ESC + 'E\x01'; // Bold text on
  static readonly BOLD_OFF = PrintCommands.ESC + 'E\x00'; // Bold text off
  static readonly UNDERLINE_ON = PrintCommands.ESC + '-\x01'; // Underline on
  static readonly UNDERLINE_OFF = PrintCommands.ESC + '-\x00'; // Underline off
  static readonly DOUBLE_HEIGHT = PrintCommands.ESC + '!\x10'; // Double height
  static readonly DOUBLE_WIDTH = PrintCommands.ESC + '!\x20'; // Double width
  static readonly NORMAL_SIZE = PrintCommands.ESC + '!\x00'; // Normal size
  
  // Alignment
  static readonly LEFT = PrintCommands.ESC + 'a\x00'; // Left align
  static readonly CENTER = PrintCommands.ESC + 'a\x01'; // Center align
  static readonly RIGHT = PrintCommands.ESC + 'a\x02'; // Right align
  
  // Character Sets
  static readonly CHARSET_UTF8 = PrintCommands.ESC + 't\x10'; // UTF-8
  static readonly CHARSET_ISO = PrintCommands.ESC + 't\x03'; // ISO 8859-1
  
  // Line Spacing
  static readonly LINE_SPACING_DEFAULT = PrintCommands.ESC + '2'; // Default line spacing
  static readonly LINE_SPACING_NARROW = PrintCommands.ESC + '0'; // Narrow line spacing
  
  // QR Code Commands
  static readonly QR_MODEL = PrintCommands.GS + '(k\x04\x00\x31\x41\x32\x00'; // QR model
  static readonly QR_SIZE = PrintCommands.GS + '(k\x03\x00\x31\x43'; // QR size
  static readonly QR_ERROR = PrintCommands.GS + '(k\x03\x00\x31\x45\x30'; // QR error correction
  
  // Barcode Commands
  static readonly BARCODE_HEIGHT = PrintCommands.GS + 'h\x64'; // Barcode height
  static readonly BARCODE_WIDTH = PrintCommands.GS + 'w\x02'; // Barcode width
  static readonly BARCODE_FONT = PrintCommands.GS + 'f\x00'; // Barcode font
  
  // Cash Drawer
  static readonly OPEN_DRAWER = PrintCommands.ESC + 'p\x00\x19\xFA'; // Open cash drawer
  
  // Status Commands
  static readonly STATUS_PAPER = PrintCommands.GS + 'r\x01'; // Paper status
  static readonly STATUS_PRINTER = PrintCommands.ESC + 'v'; // Printer status
  
  /**
   * Generate QR code command sequence
   */
  static generateQRCode(data: string, size: number = 4): string {
    const dataLength = data.length + 3;
    const lengthLow = String.fromCharCode(dataLength & 0xFF);
    const lengthHigh = String.fromCharCode((dataLength >> 8) & 0xFF);
    
    let command = '';
    command += PrintCommands.QR_MODEL;
    command += PrintCommands.QR_SIZE + String.fromCharCode(size);
    command += PrintCommands.QR_ERROR;
    command += PrintCommands.GS + '(k' + lengthLow + lengthHigh + '\x31\x50\x30' + data;
    command += PrintCommands.GS + '(k\x03\x00\x31\x51\x30'; // Print QR
    
    return command;
  }
  
  /**
   * Generate barcode command sequence
   */
  static generateBarcode(data: string, type: number = 73): string {
    let command = '';
    command += PrintCommands.BARCODE_HEIGHT;
    command += PrintCommands.BARCODE_WIDTH;
    command += PrintCommands.BARCODE_FONT;
    command += PrintCommands.GS + 'k' + String.fromCharCode(type) + String.fromCharCode(data.length) + data;
    
    return command;
  }
  
  /**
   * Generate image/logo command (placeholder for future implementation)
   */
  static generateImage(imageData: Buffer): string {
    // Placeholder for image printing functionality
    // Would require image processing and conversion to ESC/POS format
    return '';
  }
  
  /**
   * Set character spacing
   */
  static setCharacterSpacing(spacing: number): string {
    return PrintCommands.ESC + ' ' + String.fromCharCode(spacing);
  }
  
  /**
   * Set line spacing
   */
  static setLineSpacing(spacing: number): string {
    return PrintCommands.ESC + '3' + String.fromCharCode(spacing);
  }
  
  /**
   * Print and feed lines
   */
  static feedLines(lines: number): string {
    return PrintCommands.ESC + 'd' + String.fromCharCode(lines);
  }
  
  /**
   * Print and feed dots
   */
  static feedDots(dots: number): string {
    return PrintCommands.ESC + 'J' + String.fromCharCode(dots);
  }
  
  /**
   * Set print density (for thermal printers)
   */
  static setPrintDensity(density: number, breakTime: number): string {
    return PrintCommands.GS + '\x7C' + String.fromCharCode(density) + String.fromCharCode(breakTime);
  }
  
  /**
   * Combine multiple commands into a sequence
   */
  static combineCommands(...commands: string[]): string {
    return commands.join('');
  }
}

/**
 * Print Command Builder - Fluent interface for building command sequences
 */
export class PrintCommandBuilder {
  private commands: string[] = [];
  
  /**
   * Initialize printer
   */
  init(): this {
    this.commands.push(PrintCommands.INIT);
    return this;
  }
  
  /**
   * Add text with formatting
   */
  text(content: string, options?: {
    bold?: boolean;
    underline?: boolean;
    doubleHeight?: boolean;
    doubleWidth?: boolean;
    align?: 'left' | 'center' | 'right';
  }): this {
    if (options?.align) {
      switch (options.align) {
        case 'left': this.commands.push(PrintCommands.LEFT); break;
        case 'center': this.commands.push(PrintCommands.CENTER); break;
        case 'right': this.commands.push(PrintCommands.RIGHT); break;
      }
    }
    
    if (options?.bold) this.commands.push(PrintCommands.BOLD_ON);
    if (options?.underline) this.commands.push(PrintCommands.UNDERLINE_ON);
    if (options?.doubleHeight) this.commands.push(PrintCommands.DOUBLE_HEIGHT);
    if (options?.doubleWidth) this.commands.push(PrintCommands.DOUBLE_WIDTH);
    
    this.commands.push(content);
    
    // Reset formatting
    if (options?.bold) this.commands.push(PrintCommands.BOLD_OFF);
    if (options?.underline) this.commands.push(PrintCommands.UNDERLINE_OFF);
    if (options?.doubleHeight || options?.doubleWidth) {
      this.commands.push(PrintCommands.NORMAL_SIZE);
    }
    
    return this;
  }
  
  /**
   * Add line break
   */
  newLine(count: number = 1): this {
    this.commands.push(PrintCommands.LF.repeat(count));
    return this;
  }
  
  /**
   * Add separator line
   */
  separator(char: string = '=', length: number = 32): this {
    this.commands.push(PrintCommands.LEFT);
    this.commands.push(char.repeat(length));
    this.commands.push(PrintCommands.LF);
    return this;
  }
  
  /**
   * Add QR code
   */
  qrCode(data: string, size?: number): this {
    this.commands.push(PrintCommands.generateQRCode(data, size));
    return this;
  }
  
  /**
   * Add barcode
   */
  barcode(data: string, type?: number): this {
    this.commands.push(PrintCommands.generateBarcode(data, type));
    return this;
  }
  
  /**
   * Cut paper
   */
  cut(): this {
    this.commands.push(PrintCommands.CUT);
    return this;
  }
  
  /**
   * Open cash drawer
   */
  openDrawer(): this {
    this.commands.push(PrintCommands.OPEN_DRAWER);
    return this;
  }
  
  /**
   * Add custom command
   */
  custom(command: string): this {
    this.commands.push(command);
    return this;
  }
  
  /**
   * Build final command string
   */
  build(): string {
    return this.commands.join('');
  }
  
  /**
   * Clear commands and start fresh
   */
  clear(): this {
    this.commands = [];
    return this;
  }
}


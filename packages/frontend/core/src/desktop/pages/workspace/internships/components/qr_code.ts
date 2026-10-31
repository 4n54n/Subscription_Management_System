// @ts-nocheck
/**
 * Standalone IntoAI QR Code SVG Generator (Level H + Embedded Vector Icon)
 */
const IntoAI_QR = (function() {
'use strict';

  // --- QRCodegen Mini ---
  function QrCode(version, errorCorrectionLevel, dataCodewords, msk) {
    if (version < 1 || version > 40) throw new RangeError("Version value out of range");
    if (msk < -1 || msk > 7) throw new RangeError("Mask value out of range");
    this.version = version;
    this.size = version * 4 + 17;
    this.errorCorrectionLevel = errorCorrectionLevel;
    var modules = [];
    var isFunction = [];
    for (var i = 0; i < this.size; i++) {
      modules.push(new Array(this.size).fill(false));
      isFunction.push(new Array(this.size).fill(false));
    }
    this.modules = modules;
    this.isFunction = isFunction;

    // Draw function patterns
    this.drawFunctionPatterns();
    var allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords);

    // Mask
    if (msk == -1) {
      var minPenalty = 1000000000;
      var bestMask = 0;
      for (var m = 0; m < 8; m++) {
        this.applyMask(m);
        this.drawFormatBits(m);
        var penalty = this.getPenaltyScore();
        if (penalty < minPenalty) {
          minPenalty = penalty;
          bestMask = m;
        }
        this.applyMask(m); // Undoes the mask
      }
      msk = bestMask;
    }
    this.mask = msk;
    this.applyMask(msk);
    this.drawFormatBits(msk);
  }

  QrCode.prototype = {
    getModule: function(x, y) {
      if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
      return this.modules[y][x];
    },
    setFunctionModule: function(x, y, isDark) {
      this.modules[y][x] = isDark;
      this.isFunction[y][x] = true;
    },
    drawFunctionPatterns: function() {
      // Horizontal and vertical timing patterns
      for (var i = 0; i < this.size; i++) {
        this.setFunctionModule(6, i, i % 2 == 0);
        this.setFunctionModule(i, 6, i % 2 == 0);
      }
      // 3 finder patterns
      this.drawFinderPattern(3, 3);
      this.drawFinderPattern(this.size - 4, 3);
      this.drawFinderPattern(3, this.size - 4);
      // Alignment patterns
      var alignPatPos = QrCode.getAlignmentPatternPositions(this.version);
      var numAlign = alignPatPos.length;
      for (var i = 0; i < numAlign; i++) {
        for (var j = 0; j < numAlign; j++) {
          if ((i == 0 && j == 0) || (i == 0 && j == numAlign - 1) || (i == numAlign - 1 && j == 0)) continue;
          this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
        }
      }
      // Dummy format bits
      this.drawFormatBits(0);
      this.drawVersion();
    },
    drawFinderPattern: function(x, y) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var dist = Math.max(Math.abs(dx), Math.abs(dy));
          var xx = x + dx, yy = y + dy;
          if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
            this.setFunctionModule(xx, yy, dist != 2 && dist != 4);
          }
        }
      }
    },
    drawAlignmentPattern: function(x, y) {
      for (var dy = -2; dy <= 2; dy++) {
        for (var dx = -2; dx <= 2; dx++) {
          this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) != 1);
        }
      }
    },
    drawFormatBits: function(msk) {
      var data = this.errorCorrectionLevel.formatBits << 3 | msk;
      var rem = data;
      for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var bits = (data << 10 | rem) ^ 0x5412;
      for (var i = 0; i <= 5; i++) this.setFunctionModule(8, i, ((bits >>> i) & 1) != 0);
      this.setFunctionModule(8, 7, ((bits >>> 6) & 1) != 0);
      this.setFunctionModule(8, 8, ((bits >>> 7) & 1) != 0);
      this.setFunctionModule(7, 8, ((bits >>> 8) & 1) != 0);
      for (var i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, ((bits >>> i) & 1) != 0);
      for (var i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, ((bits >>> i) & 1) != 0);
      for (var i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, ((bits >>> i) & 1) != 0);
      this.setFunctionModule(8, this.size - 8, true);
    },
    drawVersion: function() {
      if (this.version < 7) return;
      var rem = this.version;
      for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var bits = this.version << 12 | rem;
      for (var i = 0; i < 18; i++) {
        var bit = ((bits >>> i) & 1) != 0;
        var a = this.size - 11 + i % 3, b = Math.floor(i / 3);
        this.setFunctionModule(a, b, bit);
        this.setFunctionModule(b, a, bit);
      }
    },
    drawCodewords: function(data) {
      var bitLen = data.length * 8;
      var bitIndex = 0;
      for (var right = this.size - 1; right >= 1; right -= 2) {
        if (right == 6) right = 5;
        for (var vert = 0; vert < this.size; vert++) {
          for (var j = 0; j < 2; j++) {
            var x = right - j;
            var upward = ((right + 1) & 2) == 0;
            var y = upward ? this.size - 1 - vert : vert;
            if (!this.isFunction[y][x] && bitIndex < bitLen) {
              this.modules[y][x] = ((data[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) != 0;
              bitIndex++;
            }
          }
        }
      }
    },
    applyMask: function(msk) {
      for (var y = 0; y < this.size; y++) {
        for (var x = 0; x < this.size; x++) {
          if (this.isFunction[y][x]) continue;
          var invert;
          switch (msk) {
            case 0: invert = (x + y) % 2 == 0; break;
            case 1: invert = y % 2 == 0; break;
            case 2: invert = x % 3 == 0; break;
            case 3: invert = (x + y) % 3 == 0; break;
            case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 == 0; break;
            case 5: invert = (x * y) % 2 + (x * y) % 3 == 0; break;
            case 6: invert = ((x * y) % 2 + (x * y) % 3) % 2 == 0; break;
            case 7: invert = ((x + y) % 2 + (x * y) % 3) % 2 == 0; break;
            default: throw new Error("Unreachable");
          }
          if (invert) this.modules[y][x] = !this.modules[y][x];
        }
      }
    },
    getPenaltyScore: function() {
      var result = 0;
      for (var y = 0; y < this.size; y++) {
        var runColor = false, runLen = 0;
        for (var x = 0; x < this.size; x++) {
          if (this.modules[y][x] == runColor) {
            runLen++;
            if (runLen == 5) result += 3;
            else if (runLen > 5) result++;
          } else {
            runColor = this.modules[y][x];
            runLen = 1;
          }
        }
      }
      for (var x = 0; x < this.size; x++) {
        var runColor = false, runLen = 0;
        for (var y = 0; y < this.size; y++) {
          if (this.modules[y][x] == runColor) {
            runLen++;
            if (runLen == 5) result += 3;
            else if (runLen > 5) result++;
          } else {
            runColor = this.modules[y][x];
            runLen = 1;
          }
        }
      }
      return result;
    },
    addEccAndInterleave: function(data) {
      var ver = this.version, ecl = this.errorCorrectionLevel;
      var numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
      var blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
      var rawCodewords = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
      var numShortBlocks = numBlocks - rawCodewords % numBlocks;
      var shortBlockDataLen = Math.floor(rawCodewords / numBlocks) - blockEccLen;

      var blocks = [];
      var rsDiv = QrCode.reedSolomonComputeDivisor(blockEccLen);
      for (var i = 0, k = 0; i < numBlocks; i++) {
        var dat = data.slice(k, k + shortBlockDataLen + (i >= numShortBlocks ? 1 : 0));
        k += dat.length;
        var ecc = QrCode.reedSolomonComputeRemainder(dat, rsDiv);
        blocks.push({ data: dat, ecc: ecc });
      }

      var result = [];
      for (var i = 0; i < blocks[0].data.length; i++) {
        for (var j = 0; j < blocks.length; j++) {
          if (i < blocks[j].data.length) result.push(blocks[j].data[i]);
        }
      }
      for (var i = 0; i < blockEccLen; i++) {
        for (var j = 0; j < blocks.length; j++) {
          result.push(blocks[j].ecc[i]);
        }
      }
      return result;
    }
  };

  QrCode.Ecc = {
    LOW: { ordinal: 0, formatBits: 1 },
    MEDIUM: { ordinal: 1, formatBits: 0 },
    QUARTILE: { ordinal: 2, formatBits: 3 },
    HIGH: { ordinal: 3, formatBits: 2 }
  };

  QrCode.encodeText = function(text, ecl) {
    ecl = ecl || QrCode.Ecc.MEDIUM;
    var seg = { mode: 4, numChars: text.length, data: [] };
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      if (code < 128) seg.data.push(code);
      else {
        var enc = encodeURIComponent(text.charAt(i));
        for (var j = 0; j < enc.length; j++) {
          if (enc.charAt(j) == '%') {
            seg.data.push(parseInt(enc.substr(j + 1, 2), 16));
            j += 2;
          } else seg.data.push(enc.charCodeAt(j));
        }
      }
    }
    seg.numChars = seg.data.length;

    // Find smallest version
    for (var version = 1; version <= 40; version++) {
      var dataCapacityBits = QrCode.getNumDataCodewords(version, ecl) * 8;
      var charCountBits = (version < 10 ? 8 : 16);
      var headerBits = 4 + charCountBits;
      var totalBits = headerBits + seg.data.length * 8;
      if (totalBits <= dataCapacityBits) {
        var bb = [];
        function appendBits(val, len) {
          for (var i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
        }
        appendBits(4, 4);
        appendBits(seg.numChars, charCountBits);
        for (var i = 0; i < seg.data.length; i++) appendBits(seg.data[i], 8);
        appendBits(0, Math.min(4, dataCapacityBits - bb.length));
        while (bb.length % 8 != 0) bb.push(0);
        var padBytes = [0xEC, 0x11], padIdx = 0;
        while (bb.length < dataCapacityBits) {
          appendBits(padBytes[padIdx % 2], 8);
          padIdx++;
        }
        var bytes = [];
        for (var i = 0; i < bb.length; i += 8) {
          var b = 0;
          for (var j = 0; j < 8; j++) b = (b << 1) | bb[i + j];
          bytes.push(b);
        }
        return new QrCode(version, ecl, bytes, -1);
      }
    }
    throw new Error("Data too long for QR Code");
  };

  QrCode.getNumRawDataModules = function(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  };
  QrCode.getNumDataCodewords = function(ver, ecl) {
    return Math.floor(QrCode.getNumRawDataModules(ver) / 8) - QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] * QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
  };
  QrCode.getAlignmentPatternPositions = function(ver) {
    if (ver == 1) return [];
    var numAlign = Math.floor(ver / 7) + 2;
    var step = (ver == 32) ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
    var result = [6];
    for (var pos = ver * 4 + 10, i = 0; i < numAlign - 1; i++, pos -= step) result.splice(1, 0, pos);
    return result;
  };
  QrCode.reedSolomonComputeDivisor = function(degree) {
    var result = new Array(degree).fill(0);
    result[degree - 1] = 1;
    var root = 1;
    for (var i = 0; i < degree; i++) {
      for (var j = 0; j < result.length; j++) {
        result[j] = QrCode.reedSolomonMultiply(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = QrCode.reedSolomonMultiply(root, 0x02);
    }
    return result;
  };
  QrCode.reedSolomonComputeRemainder = function(data, divisor) {
    var result = new Array(divisor.length).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ result.shift();
      result.push(0);
      for (var j = 0; j < divisor.length; j++) result[j] ^= QrCode.reedSolomonMultiply(divisor[j], factor);
    }
    return result;
  };
  QrCode.reedSolomonMultiply = function(x, y) {
    if (x >>> 8 != 0 || y >>> 8 != 0) throw new RangeError("Byte out of range");
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  };

  QrCode.ECC_CODEWORDS_PER_BLOCK = [
    [-1,  7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];
  QrCode.NUM_ERROR_CORRECTION_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];

  // SVG Renderer with modern rounded gradient styling, transparent body dots, and perfect center circle badge
  return {
    generateSVG: function(url, options) {
      options = options || {};
      var size = options.size || 68;
      
      // Generate QR Code with HIGH error correction (so center circle logo leaves QR 100% scannable)
      var qr = QrCode.encodeText(url, QrCode.Ecc.HIGH);
      var count = qr.size;
      var moduleSize = size / count;

      // Calculate perfect center circle parameters (compact & mathematically dead-center)
      var centerCoord = count / 2;
      var centerPx = size / 2;
      var circlePixelRadius = size * 0.150; // compact circle radius
      var circleModRadius = count * 0.150; // radius in module units

      function isFinder(x, y) {
        if (x < 7 && y < 7) return true;
        if (x >= count - 7 && y < 7) return true;
        if (x < 7 && y >= count - 7) return true;
        return false;
      }

      function isCenterCircleClear(x, y) {
        var dx = (x + 0.5) - centerCoord;
        var dy = (y + 0.5) - centerCoord;
        return Math.sqrt(dx * dx + dy * dy) <= circleModRadius;
      }

      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '">';
      
      // Gradients definition
      svg += '<defs>';
      // Top-Left Eye Gradient (Vibrant Blue to Cyan)
      svg += '<linearGradient id="qrEyeTL" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0055FF"/><stop offset="100%" stop-color="#00C8FF"/></linearGradient>';
      // Top-Right Eye Gradient
      svg += '<linearGradient id="qrEyeTR" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0055FF"/><stop offset="100%" stop-color="#00E5FF"/></linearGradient>';
      // Bottom-Left Eye Gradient
      svg += '<linearGradient id="qrEyeBL" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0043CE"/><stop offset="100%" stop-color="#00B2FE"/></linearGradient>';
      // Body Modules Gradient (Dark Navy -> Royal Blue -> Electric Blue)
      svg += '<linearGradient id="qrBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#03163A"/><stop offset="35%" stop-color="#002D9C"/><stop offset="70%" stop-color="#0648EC"/><stop offset="100%" stop-color="#0080FF"/></linearGradient>';
      // IntoAI Infinity Official Gradient
      svg += '<linearGradient id="qrInfinityGrad" x1="60" y1="0" x2="666" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#0648EC"/><stop offset="45%" stop-color="#075FF5"/><stop offset="72%" stop-color="#078FEF"/><stop offset="100%" stop-color="#09B6E3"/></linearGradient>';
      svg += '</defs>';

      // Background canvas
      svg += '<rect width="' + size + '" height="' + size + '" fill="#FFFFFF" rx="5"/>';

      // 1. Render Body Modules (Rounded Dots with subtle transparency)
      var dotRadius = (moduleSize * 0.36).toFixed(2);
      for (var y = 0; y < count; y++) {
        for (var x = 0; x < count; x++) {
          if (isFinder(x, y) || isCenterCircleClear(x, y)) {
            continue;
          }
          if (qr.getModule(x, y)) {
            var mx = (x * moduleSize).toFixed(2);
            var my = (y * moduleSize).toFixed(2);
            var mw = (moduleSize + 0.05).toFixed(2);
            var mh = (moduleSize + 0.05).toFixed(2);
            svg += '<rect x="' + mx + '" y="' + my + '" width="' + mw + '" height="' + mh + '" rx="' + dotRadius + '" ry="' + dotRadius + '" fill="url(#qrBodyGrad)" opacity="0.82"/>';
          }
        }
      }

      // 2. Render Modern Rounded Corner Finder Eyes
      var eyes = [
        { x: 0, y: 0, grad: 'url(#qrEyeTL)' },
        { x: count - 7, y: 0, grad: 'url(#qrEyeTR)' },
        { x: 0, y: count - 7, grad: 'url(#qrEyeBL)' }
      ];

      eyes.forEach(function(eye) {
        var ex = (eye.x * moduleSize).toFixed(2);
        var ey = (eye.y * moduleSize).toFixed(2);
        var eSize = (7 * moduleSize).toFixed(2);
        var outerRx = (7 * moduleSize * 0.28).toFixed(2);

        var inX = (eye.x * moduleSize + 1 * moduleSize).toFixed(2);
        var inY = (eye.y * moduleSize + 1 * moduleSize).toFixed(2);
        var inSize = (5 * moduleSize).toFixed(2);
        var innerRx = (5 * moduleSize * 0.24).toFixed(2);

        var pupX = (eye.x * moduleSize + 2 * moduleSize).toFixed(2);
        var pupY = (eye.y * moduleSize + 2 * moduleSize).toFixed(2);
        var pupSize = (3 * moduleSize).toFixed(2);
        var pupRx = (3 * moduleSize * 0.28).toFixed(2);

        // Outer Eye Frame
        svg += '<rect x="' + ex + '" y="' + ey + '" width="' + eSize + '" height="' + eSize + '" rx="' + outerRx + '" ry="' + outerRx + '" fill="' + eye.grad + '"/>';
        // White Separator
        svg += '<rect x="' + inX + '" y="' + inY + '" width="' + inSize + '" height="' + inSize + '" rx="' + innerRx + '" ry="' + innerRx + '" fill="#FFFFFF"/>';
        // Inner Eye Pupil
        svg += '<rect x="' + pupX + '" y="' + pupY + '" width="' + pupSize + '" height="' + pupSize + '" rx="' + pupRx + '" ry="' + pupRx + '" fill="' + eye.grad + '"/>';
      });

      // 3. Render Center Perfect Circle Badge (Centering: Circle at exact center of QR)
      var cPxStr = centerPx.toFixed(2);
      var cRadStr = circlePixelRadius.toFixed(2);
      svg += '<circle cx="' + cPxStr + '" cy="' + cPxStr + '" r="' + cRadStr + '" fill="#FFFFFF"/>';

      // 4. Render IntoAI Infinity Logo (Centering: Icon geometric center (362.03, 229.77) aligned with circle center)
      var logoW = circlePixelRadius * 1.45;
      var scale = logoW / 604.06;
      var tx = (centerPx - 362.03 * scale).toFixed(3);
      var ty = (centerPx - 229.77 * scale).toFixed(3);
      var scaleStr = scale.toFixed(5);

      svg += '<g transform="translate(' + tx + ', ' + ty + ') scale(' + scaleStr + ')">';
      svg += '<path d="M 412.00,240.00 C 411.81,239.93 411.27,239.50 410.87,239.58 C 410.47,239.66 410.02,240.18 409.60,240.49 C 409.19,240.80 408.77,241.11 408.35,241.44 C 407.94,241.76 407.52,242.08 407.11,242.42 C 406.70,242.75 406.29,243.09 405.88,243.43 C 405.47,243.77 405.07,244.12 404.66,244.47 C 404.26,244.82 403.85,245.18 403.45,245.54 C 403.05,245.90 402.65,246.27 402.25,246.64 C 401.85,247.01 401.46,247.38 401.06,247.76 C 400.66,248.13 400.27,248.52 399.87,248.90 C 399.48,249.28 399.09,249.67 398.70,250.06 C 398.31,250.45 397.92,250.85 397.53,251.24 C 397.14,251.64 396.75,252.04 396.36,252.44 C 395.98,252.84 395.59,253.24 395.20,253.65 C 394.82,254.05 394.44,254.46 394.05,254.87 C 393.67,255.28 393.29,255.69 392.90,256.10 C 392.52,256.51 392.14,256.93 391.76,257.34 C 391.38,257.76 391.00,258.17 390.62,258.59 C 390.24,259.00 389.86,259.42 389.48,259.84 C 389.10,260.25 388.72,260.67 388.34,261.09 C 387.96,261.51 387.59,261.92 387.21,262.34 C 386.83,262.76 386.45,263.18 386.07,263.59 C 385.70,264.01 385.32,264.42 384.94,264.84 C 384.56,265.25 384.18,265.66 383.81,266.08 C 383.43,266.49 383.05,266.90 382.67,267.31 C 382.30,267.72 381.92,268.12 381.54,268.53 C 381.16,268.93 380.78,269.34 380.40,269.74 C 380.02,270.14 379.64,270.54 379.26,270.93 C 378.88,271.33 378.50,271.72 378.12,272.11 C 377.74,272.50 377.36,272.89 376.97,273.27 C 376.59,273.66 376.21,274.04 375.82,274.42 C 375.44,274.79 375.06,275.17 374.67,275.53 C 374.28,275.90 373.79,276.22 373.51,276.63 C 373.23,277.04 373.09,277.77 373.00,278.00 C 379.12,284.12 397.47,303.84 409.71,314.74 C 421.94,325.64 434.18,335.63 446.41,343.39 C 458.65,351.15 470.88,357.20 483.12,361.30 C 495.35,365.40 507.59,367.21 519.82,368.00 C 532.06,368.78 544.29,368.74 556.53,366.02 C 568.76,363.29 581.29,358.62 593.24,351.62 C 605.18,344.63 618.30,334.77 628.19,324.06 C 638.09,313.35 646.82,299.59 652.61,287.35 C 658.41,275.12 661.07,262.88 662.98,250.65 C 664.89,238.41 665.23,226.18 664.06,213.94 C 662.90,201.71 660.60,189.47 656.00,177.24 C 651.40,165.00 645.66,151.79 636.46,140.52 C 627.27,129.26 612.88,117.36 600.82,109.65 C 588.77,101.95 576.35,97.40 564.12,94.30 C 551.88,91.19 539.65,90.75 527.41,91.02 C 515.18,91.29 502.94,92.44 490.71,95.90 C 478.47,99.37 466.24,104.53 454.00,111.83 C 441.76,119.13 429.36,128.95 417.29,139.72 C 405.23,150.48 392.83,164.18 381.59,176.41 C 370.36,188.65 361.13,200.88 349.89,213.12 C 338.66,225.35 326.25,238.28 314.18,249.83 C 302.11,261.39 289.71,273.62 277.47,282.46 C 265.23,291.29 253.00,297.98 240.76,302.86 C 228.53,307.75 216.29,311.09 204.06,311.77 C 191.82,312.45 179.25,311.96 167.35,306.94 C 155.45,301.92 141.19,291.98 132.65,281.65 C 124.10,271.31 118.87,257.18 116.08,244.94 C 113.29,232.71 112.19,220.47 115.92,208.24 C 119.65,196.00 128.59,181.09 138.46,171.54 C 148.34,161.99 162.94,154.41 175.18,150.95 C 187.41,147.48 199.65,148.39 211.88,150.74 C 224.12,153.09 236.35,157.79 248.59,165.05 C 260.82,172.31 273.06,183.63 285.29,194.29 C 297.53,204.95 315.88,223.22 322.00,229.00 C 322.22,228.80 322.93,228.22 323.33,227.82 C 323.74,227.43 324.05,227.04 324.41,226.65 C 324.77,226.25 325.13,225.86 325.49,225.47 C 325.85,225.08 326.22,224.69 326.58,224.29 C 326.94,223.90 327.30,223.51 327.67,223.12 C 328.03,222.73 328.40,222.33 328.76,221.94 C 329.13,221.55 329.49,221.16 329.86,220.76 C 330.23,220.37 330.59,219.98 330.96,219.59 C 331.33,219.20 331.70,218.80 332.06,218.41 C 332.43,218.02 332.80,217.63 333.17,217.24 C 333.54,216.84 333.91,216.45 334.28,216.06 C 334.64,215.67 335.01,215.27 335.38,214.88 C 335.75,214.49 336.12,214.10 336.49,213.71 C 336.86,213.31 337.23,212.92 337.60,212.53 C 337.97,212.14 338.34,211.75 338.71,211.35 C 339.08,210.96 339.44,210.57 339.81,210.18 C 340.18,209.78 340.55,209.39 340.92,209.00 C 341.29,208.61 341.66,208.22 342.02,207.82 C 342.39,207.43 342.76,207.04 343.12,206.65 C 343.49,206.25 343.86,205.86 344.22,205.47 C 344.59,205.08 344.95,204.69 345.32,204.29 C 345.68,203.90 346.05,203.51 346.41,203.12 C 346.77,202.73 347.14,202.33 347.50,201.94 C 347.86,201.55 348.22,201.16 348.58,200.76 C 348.94,200.37 349.30,199.98 349.66,199.59 C 350.02,199.20 350.38,198.80 350.73,198.41 C 351.09,198.02 351.45,197.63 351.80,197.24 C 352.15,196.84 352.51,196.45 352.86,196.06 C 353.21,195.67 353.56,195.27 353.91,194.88 C 354.26,194.49 354.61,194.10 354.96,193.71 C 355.31,193.31 355.65,192.92 356.00,192.53 C 356.34,192.14 356.69,191.75 357.03,191.35 C 357.37,190.96 357.89,190.57 358.05,190.18 C 358.21,189.78 358.01,189.20 358.00,189.00 C 351.90,182.90 333.44,163.77 321.41,152.41 C 309.38,141.05 297.85,129.34 285.82,120.82 C 273.79,112.29 261.43,106.26 249.24,101.27 C 237.04,96.29 224.84,92.44 212.65,90.92 C 200.45,89.40 188.25,90.22 176.06,92.15 C 163.86,94.07 151.67,96.63 139.47,102.46 C 127.27,108.30 113.46,116.94 102.86,127.15 C 92.27,137.36 82.52,151.52 75.89,163.71 C 69.26,175.90 65.75,188.10 63.10,200.29 C 60.45,212.49 59.27,224.69 60.01,236.88 C 60.75,249.08 63.47,261.27 67.53,273.47 C 71.59,285.67 75.83,298.30 84.35,310.06 C 92.87,321.82 106.83,335.32 118.65,344.05 C 130.46,352.78 143.04,358.43 155.24,362.44 C 167.43,366.45 179.63,367.57 191.82,368.09 C 204.02,368.61 216.22,367.86 228.41,365.56 C 240.61,363.25 252.80,359.79 265.00,354.27 C 277.20,348.74 289.39,341.30 301.59,332.39 C 313.78,323.48 326.32,312.00 338.18,300.81 C 350.04,289.62 361.38,277.26 372.74,265.24 C 384.11,253.21 394.65,240.84 406.35,228.65 C 418.04,216.45 430.74,202.95 442.93,192.06 C 455.13,181.17 467.33,170.20 479.53,163.32 C 491.73,156.43 503.92,152.77 516.12,150.75 C 528.31,148.72 540.50,147.60 552.71,151.18 C 564.91,154.76 579.97,162.62 589.36,172.24 C 598.75,181.85 605.61,196.68 609.05,208.88 C 612.49,221.09 613.03,233.27 610.01,245.47 C 606.98,257.67 599.83,271.78 590.89,282.06 C 581.95,292.34 568.21,302.31 556.35,307.14 C 544.50,311.97 531.96,312.18 519.76,311.05 C 507.57,309.91 495.21,306.41 483.18,300.34 C 471.15,294.28 459.45,284.70 447.58,274.64 C 435.72,264.58 417.93,245.77 412.00,240.00 Z" fill="url(#qrInfinityGrad)" fill-rule="nonzero"/>';
      svg += '</g></svg>';
      return svg;
    }
  };
})();

export function generateQrSvg(text: string, size: number = 150): string {
  try {
    return IntoAI_QR.generateSVG(text, { size: size || 150 });
  } catch (e) {
    console.error('QR generation error:', e);
    return '';
  }
}

import { upperFirst, capitalize, last, pick, compose, evolve, mapValues, matchPercent, isNil, get, castArray, omit, asyncCompose } from '@react-pdf/fns';
import * as P from '@react-pdf/primitives';
import { TextInstance } from '@react-pdf/primitives';
import stylesheet, { transformColor, processTransform, flatten } from '@react-pdf/stylesheet';
import layoutEngine, { bidi, linebreaker, justification, textDecoration, scriptItemizer, wordHyphenation } from '@react-pdf/textkit';
import _createClass from '@babel/runtime/helpers/createClass';
import { PDFFont } from '@react-pdf/pdfkit';
import _regeneratorRuntime from '@babel/runtime/helpers/regeneratorRuntime';
import _asyncToGenerator from '@babel/runtime/helpers/asyncToGenerator';
import * as Yoga from 'yoga-layout';
import _extends from '@babel/runtime/helpers/extends';
import emojiRegex from 'emoji-regex';
import resolveImage from '@react-pdf/image';
import _objectWithoutPropertiesLoose from '@babel/runtime/helpers/objectWithoutPropertiesLoose';


var standard = ['Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique', 'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique', 'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic'];

/**
 * Create attributed string from text fragments
 *
 * @param {Object[]} fragments fragments
 * @returns {Object} attributed string
 */
var fromFragments = function fromFragments(fragments) {
  var offset = 0;
  var string = '';
  var runs = [];
  fragments.forEach(function (fragment) {
    string += fragment.string;
    runs.push({
      start: offset,
      end: offset + fragment.string.length,
      attributes: fragment.attributes || {}
    });
    offset += fragment.string.length;
  });
  return {
    string: string,
    runs: runs
  };
};

/**
 * Apply transformation to text string
 *
 * @param {string} text
 * @param {string} transformation type
 * @returns {string} transformed text
 */
var transformText = function transformText(text, transformation) {
  switch (transformation) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return capitalize(text);
    case 'upperfirst':
      return upperFirst(text);
    default:
      return text;
  }
};

var StandardFont = /*#__PURE__*/function () {
  function StandardFont(src) {
    this.name = src;
    this.src = PDFFont.open(null, src);
  }
  var _proto = StandardFont.prototype;
  _proto.encode = function encode(str) {
    return this.src.encode(str);
  };
  _proto.layout = function layout(str) {
    var _this = this;
    var _this$encode = this.encode(str),
      encoded = _this$encode[0],
      positions = _this$encode[1];
    return {
      positions: positions,
      stringIndices: positions.map(function (_, i) {
        return i;
      }),
      glyphs: encoded.map(function (g, i) {
        var glyph = _this.getGlyph(parseInt(g, 16));
        glyph.advanceWidth = positions[i].advanceWidth;
        return glyph;
      })
    };
  };
  _proto.glyphForCodePoint = function glyphForCodePoint(codePoint) {
    var glyph = this.getGlyph(codePoint);
    glyph.advanceWidth = 400;
    return glyph;
  };
  _proto.getGlyph = function getGlyph(id) {
    return {
      id: id,
      _font: this.src,
      codePoints: [id],
      isLigature: false,
      name: this.src.font.characterToGlyph(id)
    };
  };
  _proto.hasGlyphForCodePoint = function hasGlyphForCodePoint(codePoint) {
    return this.src.font.characterToGlyph(codePoint) !== '.notdef';
  }

    // Based on empirical observation
    ;
  _createClass(StandardFont, [{
    key: "ascent",
    get: function get() {
      return 900;
    }

    // Based on empirical observation
  }, {
    key: "capHeight",
    get: function get() {
      switch (this.name) {
        case 'Times-Roman':
        case 'Times-Bold':
        case 'Times-Italic':
        case 'Times-BoldItalic':
          return 650;
        case 'Courier':
        case 'Courier-Bold':
        case 'Courier-Oblique':
        case 'Courier-BoldOblique':
          return 550;
        default:
          return 690;
      }
    }

    // Based on empirical observation
  }, {
    key: "xHeight",
    get: function get() {
      switch (this.name) {
        case 'Times-Roman':
        case 'Times-Bold':
        case 'Times-Italic':
        case 'Times-BoldItalic':
          return 440;
        case 'Courier':
        case 'Courier-Bold':
        case 'Courier-Oblique':
        case 'Courier-BoldOblique':
          return 390;
        default:
          return 490;
      }
    }

    // Based on empirical observation
  }, {
    key: "descent",
    get: function get() {
      switch (this.name) {
        case 'Times-Roman':
        case 'Times-Bold':
        case 'Times-Italic':
        case 'Times-BoldItalic':
          return -220;
        case 'Courier':
        case 'Courier-Bold':
        case 'Courier-Oblique':
        case 'Courier-BoldOblique':
          return -230;
        default:
          return -200;
      }
    }
  }, {
    key: "lineGap",
    get: function get() {
      return 0;
    }
  }, {
    key: "unitsPerEm",
    get: function get() {
      return 1000;
    }
  }]);
  return StandardFont;
}();

var fontCache = {};
var IGNORED_CODE_POINTS = [173];
var getFontSize = function getFontSize(node) {
  return node.attributes.fontSize || 12;
};
var getOrCreateFont = function getOrCreateFont(name) {
  if (fontCache[name]) return fontCache[name];
  var font = new StandardFont(name);
  fontCache[name] = font;
  return font;
};
var getFallbackFont = function getFallbackFont() {
  return getOrCreateFont('Helvetica');
};
var pickFontFromFontStack = function pickFontFromFontStack(codePoint, fontStack, lastFont) {
  var fontStackWithFallback = [].concat(fontStack, [getFallbackFont()]);
  if (lastFont) {
    fontStackWithFallback.unshift(lastFont);
  }
  for (var i = 0; i < fontStackWithFallback.length; i += 1) {
    var font = fontStackWithFallback[i];
    if (standard.includes(font)) {
      return getOrCreateFont(font);
    }
    if (!IGNORED_CODE_POINTS.includes(codePoint) && font && font.hasGlyphForCodePoint && font.hasGlyphForCodePoint(codePoint)) {
      return font;
    }
  }
  return getFallbackFont();
};
var fontSubstitution = function fontSubstitution() {
  return function (_ref) {
    var string = _ref.string,
      runs = _ref.runs;
    var lastFont = null;
    var lastFontSize = null;
    var lastIndex = 0;
    var index = 0;
    var res = [];
    for (var i = 0; i < runs.length; i += 1) {
      var run = runs[i];
      var defaultFont = typeof run.attributes.font === 'string' ? getOrCreateFont(run.attributes.font) : run.attributes.font;
      if (string.length === 0) {
        res.push({
          start: 0,
          end: 0,
          attributes: {
            font: defaultFont
          }
        });
        break;
      }
      var chars = string.slice(run.start, run.end);
      for (var j = 0; j < chars.length; j += 1) {
        var char = chars[j];
        var codePoint = char.codePointAt();
        // If the default font does not have a glyph and the fallback font does, we use it
        var font = pickFontFromFontStack(codePoint, run.attributes.font, lastFont);
        var fontSize = getFontSize(run);

        // If anything that would impact res has changed, update it
        if (font !== lastFont || fontSize !== lastFontSize || font.unitsPerEm !== lastFont.unitsPerEm) {
          if (lastFont) {
            res.push({
              start: lastIndex,
              end: index,
              attributes: {
                font: lastFont,
                scale: lastFontSize / lastFont.unitsPerEm
              }
            });
          }
          lastFont = font;
          lastFontSize = fontSize;
          lastIndex = index;
        }
        index += char.length;
      }
    }
    if (lastIndex < string.length) {
      var _fontSize = getFontSize(last(runs));
      res.push({
        start: lastIndex,
        end: string.length,
        attributes: {
          font: lastFont,
          scale: _fontSize / lastFont.unitsPerEm
        }
      });
    }
    return {
      string: string,
      runs: res
    };
  };
};

var isTextInstance$4 = function isTextInstance(node) {
  return node.type === P.TextInstance;
};
var engines$1 = {
  bidi: bidi,
  linebreaker: linebreaker,
  justification: justification,
  textDecoration: textDecoration,
  scriptItemizer: scriptItemizer,
  wordHyphenation: wordHyphenation,
  fontSubstitution: fontSubstitution
};
var engine$1 = layoutEngine(engines$1);
var getFragments$1 = function getFragments(fontStore, instance) {
  if (!instance) return [{
    string: ''
  }];
  var fragments = [];
  var _instance$props = instance.props,
    _instance$props$fill = _instance$props.fill,
    fill = _instance$props$fill === void 0 ? 'black' : _instance$props$fill,
    _instance$props$fontF = _instance$props.fontFamily,
    fontFamily = _instance$props$fontF === void 0 ? 'Helvetica' : _instance$props$fontF,
    fontWeight = _instance$props.fontWeight,
    fontStyle = _instance$props.fontStyle,
    _instance$props$fontS = _instance$props.fontSize,
    fontSize = _instance$props$fontS === void 0 ? 18 : _instance$props$fontS,
    textDecorationColor = _instance$props.textDecorationColor,
    textDecorationStyle = _instance$props.textDecorationStyle,
    textTransform = _instance$props.textTransform,
    opacity = _instance$props.opacity;
  var _textDecoration = instance.props.textDecoration;
  var obj = fontStore ? fontStore.getFont({
    fontFamily: fontFamily,
    fontWeight: fontWeight,
    fontStyle: fontStyle
  }) : null;
  var font = obj ? obj.data : fontFamily;
  var attributes = {
    font: font,
    opacity: opacity,
    fontSize: fontSize,
    color: fill,
    underlineStyle: textDecorationStyle,
    underline: _textDecoration === 'underline' || _textDecoration === 'underline line-through' || _textDecoration === 'line-through underline',
    underlineColor: textDecorationColor || fill,
    strike: _textDecoration === 'line-through' || _textDecoration === 'underline line-through' || _textDecoration === 'line-through underline',
    strikeStyle: textDecorationStyle,
    strikeColor: textDecorationColor || fill
  };
  for (var i = 0; i < instance.children.length; i += 1) {
    var child = instance.children[i];
    if (isTextInstance$4(child)) {
      fragments.push({
        string: transformText(child.value, textTransform),
        attributes: attributes
      });
    } else if (child) {
      fragments.push.apply(fragments, getFragments(child));
    }
  }
  return fragments;
};
var getAttributedString$1 = function getAttributedString(fontStore, instance) {
  return fromFragments(getFragments$1(fontStore, instance));
};
var AlmostInfinity = 999999999999;
var shrinkWhitespaceFactor = {
  before: -0.5,
  after: -0.5
};
var layoutTspan = function layoutTspan(fontStore) {
  return function (node) {
    var _node$props, _node$props2;
    var attributedString = getAttributedString$1(fontStore, node);
    var x = ((_node$props = node.props) === null || _node$props === void 0 ? void 0 : _node$props.x) || 0;
    var y = ((_node$props2 = node.props) === null || _node$props2 === void 0 ? void 0 : _node$props2.y) || 0;
    var container = {
      x: x,
      y: y,
      width: AlmostInfinity,
      height: AlmostInfinity
    };
    var hyphenationCallback = node.props.hyphenationCallback || (fontStore === null || fontStore === void 0 ? void 0 : fontStore.getHyphenationCallback()) || null;
    var layoutOptions = {
      hyphenationCallback: hyphenationCallback,
      shrinkWhitespaceFactor: shrinkWhitespaceFactor
    };
    var lines = engine$1(attributedString, container, layoutOptions).flat();
    return Object.assign({}, node, {
      lines: lines
    });
  };
};
var layoutText$1 = function layoutText(fontStore, node) {
  if (!node.children) return node;
  var children = node.children.map(layoutTspan(fontStore));
  return Object.assign({}, node, {
    children: children
  });
};

var isDefs = function isDefs(node) {
  return node.type === P.Defs;
};
var getDefs = function getDefs(node) {
  var children = node.children || [];
  var defs = children.find(isDefs) || {};
  var values = defs.children || [];
  return values.reduce(function (acc, value) {
    var _value$props;
    var id = (_value$props = value.props) === null || _value$props === void 0 ? void 0 : _value$props.id;
    if (id) acc[id] = value;
    return acc;
  }, {});
};

var isNotDefs = function isNotDefs(node) {
  return node.type !== P.Defs;
};
var detachDefs = function detachDefs(node) {
  if (!node.children) return node;
  var children = node.children.filter(isNotDefs);
  return Object.assign({}, node, {
    children: children
  });
};
var URL_REGEX = /url\(['"]?#([^'"]+)['"]?\)/;
var replaceDef = function replaceDef(defs, value) {
  if (!value) return undefined;
  if (!URL_REGEX.test(value)) return value;
  var match = value.match(URL_REGEX);
  return defs[match[1]];
};
var parseNodeDefs = function parseNodeDefs(defs) {
  return function (node) {
    var _node$props, _node$props2;
    var fill = replaceDef(defs, (_node$props = node.props) === null || _node$props === void 0 ? void 0 : _node$props.fill);
    var clipPath = replaceDef(defs, (_node$props2 = node.props) === null || _node$props2 === void 0 ? void 0 : _node$props2.clipPath);
    var props = Object.assign({}, node.props, {
      fill: fill,
      clipPath: clipPath
    });
    var children = node.children ? node.children.map(parseNodeDefs(defs)) : undefined;
    return Object.assign({}, node, {
      props: props,
      children: children
    });
  };
};
var parseDefs = function parseDefs(root) {
  if (!root.children) return root;
  var defs = getDefs(root);
  var children = root.children.map(parseNodeDefs(defs));
  return Object.assign({}, root, {
    children: children
  });
};
var replaceDefs = function replaceDefs(node) {
  return detachDefs(parseDefs(node));
};

var parseViewbox = function parseViewbox(value) {
  if (!value) return null;
  var values = value.split(/[,\s]+/).map(parseFloat);
  if (values.length !== 4) return null;
  return {
    minX: values[0],
    minY: values[1],
    maxX: values[2],
    maxY: values[3]
  };
};

var getContainer$1 = function getContainer(node) {
  var viewbox = parseViewbox(node.props.viewBox);
  if (viewbox) {
    return {
      width: viewbox.maxX,
      height: viewbox.maxY
    };
  }
  if (node.props.width && node.props.height) {
    return {
      width: parseFloat(node.props.width),
      height: parseFloat(node.props.height)
    };
  }
  return {
    width: 0,
    height: 0
  };
};

var SVG_INHERITED_PROPS = ['x', 'y', 'clipPath', 'clipRule', 'opacity', 'fill', 'fillOpacity', 'fillRule', 'stroke', 'strokeLinecap', 'strokeLinejoin', 'strokeOpacity', 'strokeWidth', 'textAnchor', 'dominantBaseline', 'color', 'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'letterSpacing', 'opacity', 'textDecoration', 'lineHeight', 'textAlign', 'visibility', 'wordSpacing'];
var getInheritProps = function getInheritProps(node) {
  var props = node.props || {};
  return pick(SVG_INHERITED_PROPS, props);
};
var inheritProps = function inheritProps(node) {
  if (!node.children) return node;
  var inheritedProps = getInheritProps(node);
  var children = node.children.map(function (child) {
    var props = Object.assign({}, inheritedProps, child.props || {});
    var newChild = Object.assign({}, child, {
      props: props
    });
    return inheritProps(newChild);
  });
  return Object.assign({}, node, {
    children: children
  });
};

var parseAspectRatio = function parseAspectRatio(value) {
  var match = value.replace(/[\s\r\t\n]+/gm, ' ').replace(/^defer\s/, '').split(' ');
  var align = match[0] || 'xMidYMid';
  var meetOrSlice = match[1] || 'meet';
  return {
    align: align,
    meetOrSlice: meetOrSlice
  };
};

var STYLE_PROPS = ['width', 'height', 'color', 'stroke', 'strokeWidth', 'opacity', 'fillOpacity', 'strokeOpacity', 'fill', 'fillRule', 'clipPath', 'offset', 'transform', 'strokeLinejoin', 'strokeLinecap', 'strokeDasharray'];
var VERTICAL_PROPS = ['y', 'y1', 'y2', 'height', 'cy', 'ry'];
var HORIZONTAL_PROPS = ['x', 'x1', 'x2', 'width', 'cx', 'rx'];
var isType$3 = function isType(type) {
  return function (node) {
    return node.type === type;
  };
};
var isSvg$3 = isType$3(P.Svg);
var isText$5 = isType$3(P.Text);
var isTextInstance$3 = isType$3(P.TextInstance);
var transformPercent = function transformPercent(container) {
  return function (props) {
    return mapValues(props, function (value, key) {
      var match = matchPercent(value);
      if (match && VERTICAL_PROPS.includes(key)) {
        return match.percent * container.height;
      }
      if (match && HORIZONTAL_PROPS.includes(key)) {
        return match.percent * container.width;
      }
      return value;
    });
  };
};
var parsePercent = function parsePercent(value) {
  var match = matchPercent(value);
  return match ? match.percent : parseFloat(value);
};
var parseProps = function parseProps(container) {
  return function (node) {
    var props = transformPercent(container)(node.props);
    props = evolve({
      x: parseFloat,
      x1: parseFloat,
      x2: parseFloat,
      y: parseFloat,
      y1: parseFloat,
      y2: parseFloat,
      r: parseFloat,
      rx: parseFloat,
      ry: parseFloat,
      cx: parseFloat,
      cy: parseFloat,
      width: parseFloat,
      height: parseFloat,
      offset: parsePercent,
      fill: transformColor,
      opacity: parsePercent,
      stroke: transformColor,
      stopOpacity: parsePercent,
      stopColor: transformColor,
      transform: processTransform
    }, props);
    return Object.assign({}, node, {
      props: props
    });
  };
};
var mergeStyles$1 = function mergeStyles(node) {
  var style = node.style || {};
  var props = Object.assign({}, style, node.props);
  return Object.assign({}, node, {
    props: props
  });
};
var removeNoneValues = function removeNoneValues(node) {
  var removeNone = function removeNone(value) {
    return value === 'none' ? null : value;
  };
  var props = mapValues(node.props, removeNone);
  return Object.assign({}, node, {
    props: props
  });
};
var pickStyleProps = function pickStyleProps(node) {
  var props = node.props || {};
  var styleProps = pick(STYLE_PROPS, props);
  var style = Object.assign({}, styleProps, node.style || {});
  return Object.assign({}, node, {
    style: style
  });
};
var parseSvgProps = function parseSvgProps(node) {
  var props = evolve({
    width: parseFloat,
    height: parseFloat,
    viewBox: parseViewbox,
    preserveAspectRatio: parseAspectRatio
  }, node.props);
  return Object.assign({}, node, {
    props: props
  });
};
var wrapBetweenTspan = function wrapBetweenTspan(node) {
  return {
    type: P.Tspan,
    props: {},
    children: [node]
  };
};
var addMissingTspan = function addMissingTspan(node) {
  if (!isText$5(node)) return node;
  if (!node.children) return node;
  var resolveChild = function resolveChild(child) {
    return isTextInstance$3(child) ? wrapBetweenTspan(child) : child;
  };
  var children = node.children.map(resolveChild);
  return Object.assign({}, node, {
    children: children
  });
};
var parseText = function parseText(fontStore) {
  return function (node) {
    if (isText$5(node)) return layoutText$1(fontStore, node);
    if (!node.children) return node;
    var children = node.children.map(parseText(fontStore));
    return Object.assign({}, node, {
      children: children
    });
  };
};
var resolveSvgNode = function resolveSvgNode(container) {
  return compose(parseProps(container), addMissingTspan, removeNoneValues, mergeStyles$1);
};
var resolveChildren = function resolveChildren(container) {
  return function (node) {
    if (!node.children) return node;
    var resolveChild = compose(resolveChildren(container), resolveSvgNode(container));
    var children = node.children.map(resolveChild);
    return Object.assign({}, node, {
      children: children
    });
  };
};
var resolveSvgRoot = function resolveSvgRoot(node, fontStore) {
  var container = getContainer$1(node);
  return compose(replaceDefs, parseText(fontStore), parseSvgProps, pickStyleProps, inheritProps, resolveChildren(container))(node);
};

/**
 * Pre-process SVG nodes so they can be rendered in the next steps
 *
 * @param {Object} node root node
 * @param {Object} fontStore font store
 * @returns {Object} root node
 */
var resolveSvg = function resolveSvg(node, fontStore) {
  if (!node.children) return node;
  var resolveChild = function resolveChild(child) {
    return resolveSvg(child, fontStore);
  };
  var root = isSvg$3(node) ? resolveSvgRoot(node, fontStore) : node;
  var children = root.children.map(resolveChild);
  return Object.assign({}, root, {
    children: children
  });
};

var loadYoga = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    var instance, config, node;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return Yoga.loadYoga();
        case 2:
          instance = _context.sent;
          config = instance.Config.create();
          config.setPointScaleFactor(0);
          node = {
            create: function create() {
              return instance.Node.createWithConfig(config);
            }
          };
          return _context.abrupt("return", {
            node: node
          });
        case 7:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return function loadYoga() {
    return _ref.apply(this, arguments);
  };
}();

var resolveYoga = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(root) {
    var yoga;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return loadYoga();
        case 2:
          yoga = _context.sent;
          return _context.abrupt("return", Object.assign({}, root, {
            yoga: yoga
          }));
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return function resolveYoga(_x) {
    return _ref.apply(this, arguments);
  };
}();

var getZIndex = function getZIndex(node) {
  return node.style.zIndex;
};
var shouldSort = function shouldSort(node) {
  return node.type !== P.Document && node.type !== P.Svg;
};
var sortZIndex = function sortZIndex(a, b) {
  var za = getZIndex(a);
  var zb = getZIndex(b);
  if (!za && !zb) return 0;
  if (!za) return 1;
  if (!zb) return -1;
  return zb - za;
};

/**
 * Sort children by zIndex value
 *
 * @param {Object} node
 * @returns {Object} node
 */
var resolveZIndex = function resolveZIndex(node) {
  if (!node.children) return node;
  var sortedChildren = shouldSort(node) ? node.children.sort(sortZIndex) : node.children;
  var children = sortedChildren.map(resolveZIndex);
  return Object.assign({}, node, {
    children: children
  });
};

// Caches emoji images data
var emojis = {};
var regex = emojiRegex();
var reflect = function reflect(promise) {
  return function () {
    return promise.apply(void 0, arguments).then(function (v) {
      return v;
    }, function (e) {
      return e;
    });
  };
};

// Returns a function to be able to mock resolveImage.
var makeFetchEmojiImage = function makeFetchEmojiImage() {
  return reflect(resolveImage);
};

/**
 * When an emoji as no variations, it might still have 2 parts,
 * the canonical emoji and an empty string.
 * ex.
 *   (no color) Array.from('❤️') => ["❤", "️"]
 *   (w/ color) Array.from('👍🏿') => ["👍", "🏿"]
 *
 * The empty string needs to be removed otherwise the generated
 * url will be incorect.
 */
var _removeVariationSelectors = function _removeVariationSelectors(x) {
  return x !== '️';
};
var getCodePoints = function getCodePoints(string, withVariationSelectors) {
  return Array.from(string).filter(withVariationSelectors ? function () {
    return true;
  } : _removeVariationSelectors).map(function (char) {
    return char.codePointAt(0).toString(16);
  }).join('-');
};
var buildEmojiUrl = function buildEmojiUrl(emoji, source) {
  var url = source.url,
    format = source.format,
    builder = source.builder,
    withVariationSelectors = source.withVariationSelectors;
  if (typeof builder === 'function') {
    return builder(getCodePoints(emoji, withVariationSelectors));
  }
  return "" + url + getCodePoints(emoji, withVariationSelectors) + "." + format;
};
var fetchEmojis = function fetchEmojis(string, source) {
  if (!source || !source.url && !source.builder) return [];
  var promises = [];
  Array.from(string.matchAll(regex)).forEach(function (match) {
    var emoji = match[0];
    if (!emojis[emoji] || emojis[emoji].loading) {
      var emojiUrl = buildEmojiUrl(emoji, source);
      emojis[emoji] = {
        loading: true
      };
      var fetchEmojiImage = makeFetchEmojiImage();
      promises.push(fetchEmojiImage({
        uri: emojiUrl
      }).then(function (image) {
        emojis[emoji].loading = false;
        emojis[emoji].data = image.data;
      }));
    }
  });
  return promises;
};
var specialCases = ['©️', '®', '™']; // Do not treat these as emojis if emoji not present

var embedEmojis = function embedEmojis(fragments) {
  var result = [];
  var _loop = function _loop() {
    var fragment = fragments[i];
    var lastIndex = 0;
    Array.from(fragment.string.matchAll(regex)).forEach(function (match) {
      var index = match.index;
      var emoji = match[0];
      var isSpecialCase = specialCases.includes(emoji);
      var emojiSize = fragment.attributes.fontSize;
      var chunk = fragment.string.slice(lastIndex, index + match[0].length);

      // If emoji image was found, we create a new fragment with the
      // correct attachment and object substitution character;
      if (emojis[emoji] && emojis[emoji].data) {
        result.push({
          string: chunk.replace(match, String.fromCharCode(0xfffc)),
          attributes: _extends({}, fragment.attributes, {
            attachment: {
              width: emojiSize,
              height: emojiSize,
              yOffset: Math.floor(emojiSize * 0.1),
              image: emojis[emoji].data
            }
          })
        });
      } else if (isSpecialCase) {
        result.push({
          string: chunk,
          attributes: fragment.attributes
        });
      } else {
        // If no emoji data, we just replace the emoji with a nodef char
        result.push({
          string: chunk.replace(match, String.fromCharCode(0)),
          attributes: fragment.attributes
        });
      }
      lastIndex = index + emoji.length;
    });
    if (lastIndex < fragment.string.length) {
      result.push({
        string: fragment.string.slice(lastIndex),
        attributes: fragment.attributes
      });
    }
  };
  for (var i = 0; i < fragments.length; i += 1) {
    _loop();
  }
  return result;
};

/**
 * Get image source
 *
 * @param {Object} node image node
 * @returns {string | Object} image src
 */
var getSource = function getSource(node) {
  var _node$props, _node$props2, _node$props3;
  return ((_node$props = node.props) === null || _node$props === void 0 ? void 0 : _node$props.src) || ((_node$props2 = node.props) === null || _node$props2 === void 0 ? void 0 : _node$props2.source) || ((_node$props3 = node.props) === null || _node$props3 === void 0 ? void 0 : _node$props3.href);
};

/**
 * Resolves `src` to `@react-pdf/image` interface.
 *
 * Also it handles factories and async sources.
 *
 * @param {string | Object | Function} src
 * @returns {Promise<Object>} resolved src
 */
var resolveSource = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(src) {
    var source;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!(typeof src === 'function')) {
            _context.next = 6;
            break;
          }
          _context.next = 3;
          return src();
        case 3:
          _context.t0 = _context.sent;
          _context.next = 9;
          break;
        case 6:
          _context.next = 8;
          return src;
        case 8:
          _context.t0 = _context.sent;
        case 9:
          source = _context.t0;
          return _context.abrupt("return", typeof source === 'string' ? {
            uri: source
          } : source);
        case 11:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return function resolveSource(_x) {
    return _ref.apply(this, arguments);
  };
}();

/**
 * Fetches image and append data to node
 * Ideally this fn should be immutable.
 *
 * @param {Object} node
 */
var fetchImage = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(node) {
    var src, cache, source;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          src = getSource(node);
          cache = node.props.cache;
          if (src) {
            _context.next = 5;
            break;
          }
          console.warn(false, 'Image should receive either a "src" or "source" prop');
          return _context.abrupt("return");
        case 5:
          _context.prev = 5;
          _context.next = 8;
          return resolveSource(src);
        case 8:
          source = _context.sent;
          if (source) {
            _context.next = 11;
            break;
          }
          throw new Error("Image's \"src\" or \"source\" prop returned " + source);
        case 11:
          _context.next = 13;
          return resolveImage(source, {
            cache: cache
          });
        case 13:
          node.image = _context.sent;
          node.image.key = source.data ? source.data.toString() : source.uri;
          _context.next = 21;
          break;
        case 17:
          _context.prev = 17;
          _context.t0 = _context["catch"](5);
          node.image = {
            width: 0,
            height: 0,
            key: null
          };
          console.warn(_context.t0.message);
        case 21:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[5, 17]]);
  }));
  return function fetchImage(_x) {
    return _ref.apply(this, arguments);
  };
}();

var isImage$2 = function isImage(node) {
  return node.type === P.Image;
};

/**
 * Get all asset promises that need to be resolved
 *
 * @param {Object} fontStore font store
 * @param {Object} node root node
 * @returns {Promise<void>[]} asset promises
 */
var fetchAssets = function fetchAssets(fontStore, node) {
  var _node$children;
  var promises = [];
  var listToExplore = ((_node$children = node.children) === null || _node$children === void 0 ? void 0 : _node$children.slice(0)) || [];
  var emojiSource = fontStore ? fontStore.getEmojiSource() : null;
  while (listToExplore.length > 0) {
    var _n$style;
    var n = listToExplore.shift();
    if (isImage$2(n)) {
      promises.push(fetchImage(n));
    }
    if (fontStore && (_n$style = n.style) !== null && _n$style !== void 0 && _n$style.fontFamily) {
      promises.push(fontStore.load(n.style));
    }
    if (typeof n === 'string') {
      promises.push.apply(promises, fetchEmojis(n, emojiSource));
    }
    if (typeof n.value === 'string') {
      promises.push.apply(promises, fetchEmojis(n.value, emojiSource));
    }
    if (n.children) {
      n.children.forEach(function (childNode) {
        listToExplore.push(childNode);
      });
    }
  }
  return promises;
};

/**
 * Fetch image, font and emoji assets in parallel.
 * Layout process will not be resumed until promise resolves.
 *
 * @param {Object} node root node
 * @param {Object} fontStore font store
 * @returns {Promise<Object>} root node
 */
var resolveAssets = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(node, fontStore) {
    var promises;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          promises = fetchAssets(fontStore, node);
          _context.next = 3;
          return Promise.all(promises);
        case 3:
          return _context.abrupt("return", node);
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return function resolveAssets(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var isLink$1 = function isLink(node) {
  return node.type === P.Link;
};
var DEFAULT_LINK_STYLES = {
  color: 'blue',
  textDecoration: 'underline'
};

/**
 * Computes styles using stylesheet
 *
 * @param {Object} container
 * @param {Object} node document node
 * @returns {Object} computed styles
 */
var computeStyle = function computeStyle(container, node) {
  var baseStyle = node.style;
  if (isLink$1(node)) {
    baseStyle = Array.isArray(node.style) ? [DEFAULT_LINK_STYLES].concat(node.style) : [DEFAULT_LINK_STYLES, node.style];
  }
  return stylesheet(container, baseStyle);
};

/**
 * @typedef {Function} ResolveNodeStyles
 * @param {Object} node document node
 * @returns {Object} node (and subnodes) with resolved styles
 */

/**
 * Resolves node styles
 *
 * @param {Object} container
 * @returns {ResolveNodeStyles} resolve node styles
 */
var resolveNodeStyles = function resolveNodeStyles(container) {
  return function (node) {
    var style = computeStyle(container, node);
    if (!node.children) return Object.assign({}, node, {
      style: style
    });
    var children = node.children.map(resolveNodeStyles(container));
    return Object.assign({}, node, {
      style: style,
      children: children
    });
  };
};

/**
 * Resolves page styles
 *
 * @param {Object} page document page
 * @returns {Object} document page with resolved styles
 */
var resolvePageStyles = function resolvePageStyles(page) {
  var _page$props, _page$box, _page$box2, _page$props2;
  var dpi = ((_page$props = page.props) === null || _page$props === void 0 ? void 0 : _page$props.dpi) || 72;
  var width = ((_page$box = page.box) === null || _page$box === void 0 ? void 0 : _page$box.width) || page.style.width;
  var height = ((_page$box2 = page.box) === null || _page$box2 === void 0 ? void 0 : _page$box2.height) || page.style.height;
  var orientation = ((_page$props2 = page.props) === null || _page$props2 === void 0 ? void 0 : _page$props2.orientation) || 'portrait';
  var container = {
    width: width,
    height: height,
    orientation: orientation,
    dpi: dpi
  };
  return resolveNodeStyles(container)(page);
};

/**
 * Resolves document styles
 *
 * @param {Object} root document root
 * @returns {Object} document root with resolved styles
 */
var resolveStyles = function resolveStyles(root) {
  if (!root.children) return root;
  var children = root.children.map(resolvePageStyles);
  return Object.assign({}, root, {
    children: children
  });
};

var getTransformStyle = function getTransformStyle(s) {
  return function (node) {
    var _node$style, _node$style2;
    return isNil((_node$style = node.style) === null || _node$style === void 0 ? void 0 : _node$style[s]) ? '50%' : (_node$style2 = node.style) === null || _node$style2 === void 0 ? void 0 : _node$style2[s];
  };
};

/**
 * Get node origin
 *
 * @param {Object} node
 * @returns {{ left?: number, top?: number }} node origin
 */
var getOrigin = function getOrigin(node) {
  if (!node.box) return {};
  var _node$box = node.box,
    left = _node$box.left,
    top = _node$box.top,
    width = _node$box.width,
    height = _node$box.height;
  var transformOriginX = getTransformStyle('transformOriginX')(node);
  var transformOriginY = getTransformStyle('transformOriginY')(node);
  var percentX = matchPercent(transformOriginX);
  var percentY = matchPercent(transformOriginY);
  var offsetX = percentX ? width * percentX.percent : transformOriginX;
  var offsetY = percentY ? height * percentY.percent : transformOriginY;
  return {
    left: left + offsetX,
    top: top + offsetY
  };
};

/**
 * Resolve node origin
 *
 * @param {Object} node
 * @returns {Object} node with origin attribute
 */
var resolveNodeOrigin = function resolveNodeOrigin(node) {
  var origin = getOrigin(node);
  var newNode = Object.assign({}, node, {
    origin: origin
  });
  if (!node.children) return newNode;
  var children = node.children.map(resolveNodeOrigin);
  return Object.assign({}, newNode, {
    children: children
  });
};

/**
 * Resolve document origins
 *
 * @param {Object} root document root
 * @returns {Object} document root
 */

var resolveOrigin = function resolveOrigin(root) {
  if (!root.children) return root;
  var children = root.children.map(resolveNodeOrigin);
  return Object.assign({}, root, {
    children: children
  });
};

/* eslint-disable no-plusplus */
/* eslint-disable prefer-const */
/* eslint-disable prefer-destructuring */

var getBookmarkValue = function getBookmarkValue(title) {
  return typeof title === 'string' ? {
    title: title,
    fit: false,
    expanded: false
  } : title;
};
var resolveBookmarks = function resolveBookmarks(node) {
  var refs = 0;
  var children = (node.children || []).slice(0);
  var listToExplore = children.map(function (value) {
    return {
      value: value,
      parent: null
    };
  });
  var _loop = function _loop() {
    var _child$props;
    var element = listToExplore.shift();
    var child = element.value;
    var parent = element.parent;
    if ((_child$props = child.props) !== null && _child$props !== void 0 && _child$props.bookmark) {
      var _parent;
      var bookmark = getBookmarkValue(child.props.bookmark);
      var ref = refs++;
      var newHierarchy = _extends({
        ref: ref,
        parent: (_parent = parent) === null || _parent === void 0 ? void 0 : _parent.ref
      }, bookmark);
      child.props.bookmark = newHierarchy;
      parent = newHierarchy;
    }
    if (child.children) {
      child.children.forEach(function (childNode) {
        listToExplore.push({
          value: childNode,
          parent: parent
        });
      });
    }
  };
  while (listToExplore.length > 0) {
    _loop();
  }
  return node;
};

var VALID_ORIENTATIONS = ['portrait', 'landscape'];

/**
 * Get page orientation. Defaults to portrait
 *
 * @param {Object} page object
 * @returns {string} page orientation
 */
var getOrientation = function getOrientation(page) {
  var _page$props;
  var value = ((_page$props = page.props) === null || _page$props === void 0 ? void 0 : _page$props.orientation) || 'portrait';
  return VALID_ORIENTATIONS.includes(value) ? value : 'portrait';
};

/**
 * Return true if page is landscape
 *
 * @param {Object} page instance
 * @returns {boolean} is page landscape
 */
var isLandscape = function isLandscape(page) {
  return getOrientation(page) === 'landscape';
};

var PAGE_SIZES = {
  '4A0': [4767.87, 6740.79],
  '2A0': [3370.39, 4767.87],
  A0: [2383.94, 3370.39],
  A1: [1683.78, 2383.94],
  A2: [1190.55, 1683.78],
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  A6: [297.64, 419.53],
  A7: [209.76, 297.64],
  A8: [147.4, 209.76],
  A9: [104.88, 147.4],
  A10: [73.7, 104.88],
  B0: [2834.65, 4008.19],
  B1: [2004.09, 2834.65],
  B2: [1417.32, 2004.09],
  B3: [1000.63, 1417.32],
  B4: [708.66, 1000.63],
  B5: [498.9, 708.66],
  B6: [354.33, 498.9],
  B7: [249.45, 354.33],
  B8: [175.75, 249.45],
  B9: [124.72, 175.75],
  B10: [87.87, 124.72],
  C0: [2599.37, 3676.54],
  C1: [1836.85, 2599.37],
  C2: [1298.27, 1836.85],
  C3: [918.43, 1298.27],
  C4: [649.13, 918.43],
  C5: [459.21, 649.13],
  C6: [323.15, 459.21],
  C7: [229.61, 323.15],
  C8: [161.57, 229.61],
  C9: [113.39, 161.57],
  C10: [79.37, 113.39],
  RA0: [2437.8, 3458.27],
  RA1: [1729.13, 2437.8],
  RA2: [1218.9, 1729.13],
  RA3: [864.57, 1218.9],
  RA4: [609.45, 864.57],
  SRA0: [2551.18, 3628.35],
  SRA1: [1814.17, 2551.18],
  SRA2: [1275.59, 1814.17],
  SRA3: [907.09, 1275.59],
  SRA4: [637.8, 907.09],
  EXECUTIVE: [521.86, 756.0],
  FOLIO: [612.0, 936.0],
  LEGAL: [612.0, 1008.0],
  LETTER: [612.0, 792.0],
  TABLOID: [792.0, 1224.0],
  ID1: [153, 243]
};

/**
 * Transforms array into size object
 *
 * @param {number[]} v array
 * @returns {{ width: number, height: number }} size object with width and height
 */
var toSizeObject = function toSizeObject(v) {
  return {
    width: v[0],
    height: v[1]
  };
};

/**
 * Flip size object
 *
 * @param {{ width: number, height: number }} v size object
 * @returns {{ width: number, height: number }} flipped size object
 */
var flipSizeObject = function flipSizeObject(v) {
  return {
    width: v.height,
    height: v.width
  };
};

/**
 * Adjust page size to passed DPI
 *
 * @param {{ width: number, height: number }} v size object
 * @param {number} dpi DPI
 * @returns {{ width: number, height: number }} adjusted size object
 */
var adjustDpi = function adjustDpi(v, dpi) {
  return {
    width: v.width ? v.width * dpi : v.width,
    height: v.height ? v.height * dpi : v.height
  };
};

/**
 * Returns size object from a given string
 *
 * @param {string} v page size string
 * @returns {{ width: number, height: number }} size object with width and height
 */
var getStringSize = function getStringSize(v) {
  return toSizeObject(PAGE_SIZES[v.toUpperCase()]);
};

/**
 * Returns size object from a single number
 *
 * @param {number} n page size number
 * @returns {{ width: number, height: number }} size object with width and height
 */
var getNumberSize = function getNumberSize(n) {
  return toSizeObject([n]);
};

/**
 * Return page size in an object { width, height }
 *
 * @param {Object} page instance
 * @returns {{ width: number, height: number }} size object with width and height
 */
var getSize = function getSize(page) {
  var _page$props, _page$props2;
  var value = ((_page$props = page.props) === null || _page$props === void 0 ? void 0 : _page$props.size) || 'A4';
  var dpi = parseFloat(((_page$props2 = page.props) === null || _page$props2 === void 0 ? void 0 : _page$props2.dpi) || 72);
  var type = typeof value;

  /**
   * @type {{ width: number, height: number }}
   */
  var size;
  if (type === 'string') {
    size = getStringSize(value);
  } else if (Array.isArray(value)) {
    size = toSizeObject(value);
  } else if (type === 'number') {
    size = getNumberSize(value);
  } else {
    size = value;
  }
  size = adjustDpi(size, dpi / 72);
  return isLandscape(page) ? flipSizeObject(size) : size;
};

/**
 * Resolves page size
 *
 * @param {Object} page
 * @returns {Object} page with resolved size in style attribute
 */
var resolvePageSize = function resolvePageSize(page) {
  var size = getSize(page);
  var style = flatten(page.style || {});
  return _extends({}, page, {
    style: _extends({}, style, size)
  });
};

/**
 * Resolves page sizes
 *
 * @param {Object} root document root
 * @returns {Object} document root with resolved page sizes
 */
var resolvePageSizes = function resolvePageSizes(root) {
  if (!root.children) return root;
  var children = root.children.map(resolvePageSize);
  return Object.assign({}, root, {
    children: children
  });
};

var isFixed = function isFixed(node) {
  var _node$props;
  return ((_node$props = node.props) === null || _node$props === void 0 ? void 0 : _node$props.fixed) === true;
};

/**
 * Get line index at given height
 *
 * @param {Object} node
 * @param {number} height
 */
var lineIndexAtHeight = function lineIndexAtHeight(node, height) {
  var y = 0;
  if (!node.lines) return 0;
  for (var i = 0; i < node.lines.length; i += 1) {
    var line = node.lines[i];
    if (y + line.box.height > height) return i;
    y += line.box.height;
  }
  return node.lines.length;
};

/**
 * Get height for given text line index
 *
 * @param {Object} node
 * @param {number} index
 */
var heightAtLineIndex = function heightAtLineIndex(node, index) {
  var counter = 0;
  if (!node.lines) return counter;
  for (var i = 0; i < index; i += 1) {
    var line = node.lines[i];
    if (!line) break;
    counter += line.box.height;
  }
  return counter;
};

var getLineBreak = function getLineBreak(node, height) {
  var top = get(node, ['box', 'top'], 0);
  var widows = get(node, ['props', 'widows'], 2);
  var orphans = get(node, ['props', 'orphans'], 2);
  var linesQuantity = node.lines.length;
  var slicedLine = lineIndexAtHeight(node, height - top);
  if (slicedLine === 0) {
    return 0;
  }
  if (linesQuantity < orphans) {
    return linesQuantity;
  }
  if (slicedLine < orphans || linesQuantity < orphans + widows) {
    return 0;
  }
  if (linesQuantity === orphans + widows) {
    return orphans;
  }
  if (linesQuantity - slicedLine < widows) {
    return linesQuantity - widows;
  }
  return slicedLine;
};

// Also receives contentArea in case it's needed
var splitText = function splitText(node, height) {
  var slicedLineIndex = getLineBreak(node, height);
  var currentHeight = heightAtLineIndex(node, slicedLineIndex);
  var nextHeight = node.box.height - currentHeight;
  var current = Object.assign({}, node, {
    box: _extends({}, node.box, {
      height: currentHeight,
      borderBottomWidth: 0
    }),
    style: _extends({}, node.style, {
      marginBottom: 0,
      paddingBottom: 0,
      borderBottomWidth: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0
    }),
    lines: node.lines.slice(0, slicedLineIndex)
  });
  var next = Object.assign({}, node, {
    box: _extends({}, node.box, {
      top: 0,
      height: nextHeight,
      borderTopWidth: 0
    }),
    style: _extends({}, node.style, {
      marginTop: 0,
      paddingTop: 0,
      borderTopWidth: 0,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0
    }),
    lines: node.lines.slice(slicedLineIndex)
  });
  return [current, next];
};

var getTop$1 = function getTop(node) {
  var _node$box;
  return ((_node$box = node.box) === null || _node$box === void 0 ? void 0 : _node$box.top) || 0;
};
var hasFixedHeight = function hasFixedHeight(node) {
  var _node$style;
  return !isNil((_node$style = node.style) === null || _node$style === void 0 ? void 0 : _node$style.height);
};
var splitNode = function splitNode(node, height) {
  if (!node) return [null, null];
  var nodeTop = getTop$1(node);
  var current = Object.assign({}, node, {
    box: _extends({}, node.box, {
      borderBottomWidth: 0
    }),
    style: _extends({}, node.style, {
      marginBottom: 0,
      paddingBottom: 0,
      borderBottomWidth: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0
    })
  });
  current.style.height = height - nodeTop;
  var nextHeight = hasFixedHeight(node) ? node.box.height - (height - nodeTop) : null;
  var next = Object.assign({}, node, {
    box: _extends({}, node.box, {
      top: 0,
      borderTopWidth: 0
    }),
    style: _extends({}, node.style, {
      marginTop: 0,
      paddingTop: 0,
      borderTopWidth: 0,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0
    })
  });
  if (nextHeight) {
    next.style.height = nextHeight;
  }
  return [current, next];
};

var NON_WRAP_TYPES = [P.Svg, P.Note, P.Image, P.Canvas];
var getWrap = function getWrap(node) {
  var _node$props;
  if (NON_WRAP_TYPES.includes(node.type)) return false;
  return isNil((_node$props = node.props) === null || _node$props === void 0 ? void 0 : _node$props.wrap) ? true : node.props.wrap;
};

var getComputedPadding = function getComputedPadding(node, edge) {
  var yogaNode = node.yogaNode;
  return yogaNode ? yogaNode.getComputedPadding(edge) : null;
};

/**
 * Get Yoga computed paddings. Zero otherwise
 *
 * @param {Object} node
 * @returns {{ paddingTop: number, paddingRight: number, paddingBottom: number, paddingLeft: number }} paddings
 */
var getPadding = function getPadding(node) {
  var style = node.style,
    box = node.box;
  var paddingTop = getComputedPadding(node, Yoga.Edge.Top) || (box === null || box === void 0 ? void 0 : box.paddingTop) || (style === null || style === void 0 ? void 0 : style.paddingTop) || (style === null || style === void 0 ? void 0 : style.paddingVertical) || (style === null || style === void 0 ? void 0 : style.padding) || 0;
  var paddingRight = getComputedPadding(node, Yoga.Edge.Right) || (box === null || box === void 0 ? void 0 : box.paddingRight) || (style === null || style === void 0 ? void 0 : style.paddingRight) || (style === null || style === void 0 ? void 0 : style.paddingHorizontal) || (style === null || style === void 0 ? void 0 : style.padding) || 0;
  var paddingBottom = getComputedPadding(node, Yoga.Edge.Bottom) || (box === null || box === void 0 ? void 0 : box.paddingBottom) || (style === null || style === void 0 ? void 0 : style.paddingBottom) || (style === null || style === void 0 ? void 0 : style.paddingVertical) || (style === null || style === void 0 ? void 0 : style.padding) || 0;
  var paddingLeft = getComputedPadding(node, Yoga.Edge.Left) || (box === null || box === void 0 ? void 0 : box.paddingLeft) || (style === null || style === void 0 ? void 0 : style.paddingLeft) || (style === null || style === void 0 ? void 0 : style.paddingHorizontal) || (style === null || style === void 0 ? void 0 : style.padding) || 0;
  return {
    paddingTop: paddingTop,
    paddingRight: paddingRight,
    paddingBottom: paddingBottom,
    paddingLeft: paddingLeft
  };
};

var getWrapArea = function getWrapArea(page) {
  var _page$style;
  var _getPadding = getPadding(page),
    paddingBottom = _getPadding.paddingBottom;
  var height = (_page$style = page.style) === null || _page$style === void 0 ? void 0 : _page$style.height;
  return height - paddingBottom;
};

var getContentArea = function getContentArea(page) {
  var _page$style;
  var height = (_page$style = page.style) === null || _page$style === void 0 ? void 0 : _page$style.height;
  var _getPadding = getPadding(page),
    paddingTop = _getPadding.paddingTop,
    paddingBottom = _getPadding.paddingBottom;
  return height - paddingBottom - paddingTop;
};

var _excluded = ["style", "children"];
var isString = function isString(value) {
  return typeof value === 'string';
};
var isNumber = function isNumber(value) {
  return typeof value === 'number';
};
var isFragment = function isFragment(value) {
  return value && value.type === Symbol.for('react.fragment');
};

/**
 * Transforms a react element instance to internal element format.
 *
 * Can return multiple instances in the case of arrays or fragments.
 *
 * @param {Object} element React element
 * @returns {Object[]} parsed React elements
 */
var createInstances = function createInstances(element) {
  if (!element) return [];
  if (isString(element) || isNumber(element)) {
    return [{
      type: TextInstance,
      value: "" + element
    }];
  }
  if (isFragment(element)) {
    return createInstances(element.props.children);
  }
  if (Array.isArray(element)) {
    return element.reduce(function (acc, el) {
      return acc.concat(createInstances(el));
    }, []);
  }
  if (!isString(element.type)) {
    return createInstances(element.type(element.props));
  }
  var type = element.type,
    _element$props = element.props,
    _element$props$style = _element$props.style,
    style = _element$props$style === void 0 ? {} : _element$props$style,
    _element$props$childr = _element$props.children,
    children = _element$props$childr === void 0 ? [] : _element$props$childr,
    props = _objectWithoutPropertiesLoose(_element$props, _excluded);
  var nextChildren = castArray(children).reduce(function (acc, child) {
    return acc.concat(createInstances(child));
  }, []);
  return [{
    type: type,
    style: style,
    props: props,
    box: {},
    children: nextChildren
  }];
};

/* eslint-disable no-continue */

var getBreak = function getBreak(node) {
  var _node$props;
  return ((_node$props = node.props) === null || _node$props === void 0 ? void 0 : _node$props.break) || false;
};
var getMinPresenceAhead = function getMinPresenceAhead(node) {
  var _node$props2;
  return ((_node$props2 = node.props) === null || _node$props2 === void 0 ? void 0 : _node$props2.minPresenceAhead) || 0;
};
var getFurthestEnd = function getFurthestEnd(elements) {
  return Math.max.apply(Math, elements.map(function (node) {
    return node.box.top + node.box.height;
  }));
};
var getEndOfMinPresenceAhead = function getEndOfMinPresenceAhead(child) {
  return child.box.top + child.box.height + child.box.marginBottom + getMinPresenceAhead(child);
};
var getEndOfPresence = function getEndOfPresence(child, futureElements) {
  var afterMinPresenceAhead = getEndOfMinPresenceAhead(child);
  var endOfFurthestFutureElement = getFurthestEnd(futureElements.filter(function (node) {
    var _node$props3;
    return !((_node$props3 = node.props) !== null && _node$props3 !== void 0 && _node$props3.fixed);
  }));
  return Math.min(afterMinPresenceAhead, endOfFurthestFutureElement);
};
var shouldBreak = function shouldBreak(child, futureElements, height) {
  var _child$props;
  if ((_child$props = child.props) !== null && _child$props !== void 0 && _child$props.fixed) return false;
  var shouldSplit = height < child.box.top + child.box.height;
  var canWrap = getWrap(child);

  // Calculate the y coordinate where the desired presence of the child ends
  var endOfPresence = getEndOfPresence(child, futureElements);
  // If the child is already at the top of the page, breaking won't improve its presence
  // (as long as react-pdf does not support breaking into differently sized containers)
  var breakingImprovesPresence = child.box.top > child.box.marginTop;
  return getBreak(child) || shouldSplit && !canWrap || !shouldSplit && endOfPresence > height && breakingImprovesPresence;
};

var IGNORABLE_CODEPOINTS = [8232,
  // LINE_SEPARATOR
  8233 // PARAGRAPH_SEPARATOR
];
var buildSubsetForFont = function buildSubsetForFont(font) {
  return IGNORABLE_CODEPOINTS.reduce(function (acc, codePoint) {
    if (font && font.hasGlyphForCodePoint && font.hasGlyphForCodePoint(codePoint)) {
      return acc;
    }
    return [].concat(acc, [String.fromCharCode(codePoint)]);
  }, []);
};
var ignoreChars = function ignoreChars(fragments) {
  return fragments.map(function (fragment) {
    var charSubset = buildSubsetForFont(fragment.attributes.font);
    var subsetRegex = new RegExp(charSubset.join('|'));
    return {
      string: fragment.string.replace(subsetRegex, ''),
      attributes: fragment.attributes
    };
  });
};

var PREPROCESSORS = [ignoreChars, embedEmojis];
var isImage$1 = function isImage(node) {
  return node.type === P.Image;
};
var isTextInstance$2 = function isTextInstance(node) {
  return node.type === P.TextInstance;
};

/**
 * Get textkit fragments of given node object
 *
 * @param {Object} fontStore font store
 * @param {Object} instance node
 * @param {string} [parentLink] parent link
 * @param {number} [level] fragment level
 * @returns {Object[]} text fragments
 */
var getFragments = function getFragments(fontStore, instance, parentLink, level) {
  var _instance$props, _instance$props2;
  if (level === void 0) {
    level = 0;
  }
  if (!instance) return [{
    string: ''
  }];
  var fragments = [];
  var _instance$style = instance.style,
    _instance$style$color = _instance$style.color,
    color = _instance$style$color === void 0 ? 'black' : _instance$style$color,
    _instance$style$direc = _instance$style.direction,
    direction = _instance$style$direc === void 0 ? 'ltr' : _instance$style$direc,
    _instance$style$fontF = _instance$style.fontFamily,
    fontFamily = _instance$style$fontF === void 0 ? 'Helvetica' : _instance$style$fontF,
    fontWeight = _instance$style.fontWeight,
    fontStyle = _instance$style.fontStyle,
    _instance$style$fontS = _instance$style.fontSize,
    fontSize = _instance$style$fontS === void 0 ? 18 : _instance$style$fontS,
    textAlign = _instance$style.textAlign,
    lineHeight = _instance$style.lineHeight,
    textDecoration = _instance$style.textDecoration,
    textDecorationColor = _instance$style.textDecorationColor,
    textDecorationStyle = _instance$style.textDecorationStyle,
    textTransform = _instance$style.textTransform,
    letterSpacing = _instance$style.letterSpacing,
    textIndent = _instance$style.textIndent,
    opacity = _instance$style.opacity,
    verticalAlign = _instance$style.verticalAlign;
  var fontFamilies = typeof fontFamily === 'string' ? [fontFamily] : [].concat(fontFamily || []);
  var font = fontFamilies.map(function (fontFamilyName) {
    if (typeof fontFamilyName !== 'string') return fontFamilyName;
    var opts = {
      fontFamily: fontFamilyName,
      fontWeight: fontWeight,
      fontStyle: fontStyle
    };
    var obj = fontStore ? fontStore.getFont(opts) : null;
    return obj ? obj.data : fontFamilyName;
  });

  // Don't pass main background color to textkit. Will be rendered by the render package instead
  var backgroundColor = level === 0 ? null : instance.style.backgroundColor;
  var attributes = {
    font: font,
    color: color,
    opacity: opacity,
    fontSize: fontSize,
    direction: direction,
    verticalAlign: verticalAlign,
    backgroundColor: backgroundColor,
    indent: textIndent,
    characterSpacing: letterSpacing,
    strikeStyle: textDecorationStyle,
    underlineStyle: textDecorationStyle,
    underline: textDecoration === 'underline' || textDecoration === 'underline line-through' || textDecoration === 'line-through underline',
    strike: textDecoration === 'line-through' || textDecoration === 'underline line-through' || textDecoration === 'line-through underline',
    strikeColor: textDecorationColor || color,
    underlineColor: textDecorationColor || color,
    link: parentLink || ((_instance$props = instance.props) === null || _instance$props === void 0 ? void 0 : _instance$props.src) || ((_instance$props2 = instance.props) === null || _instance$props2 === void 0 ? void 0 : _instance$props2.href),
    lineHeight: lineHeight ? lineHeight * fontSize : null,
    align: textAlign || (direction === 'rtl' ? 'right' : 'left')
  };
  for (var i = 0; i < instance.children.length; i += 1) {
    var child = instance.children[i];
    if (isImage$1(child)) {
      fragments.push({
        string: String.fromCharCode(0xfffc),
        attributes: _extends({}, attributes, {
          attachment: {
            width: child.style.width || fontSize,
            height: child.style.height || fontSize,
            image: child.image.data
          }
        })
      });
    } else if (isTextInstance$2(child)) {
      fragments.push({
        string: transformText(child.value, textTransform),
        attributes: attributes
      });
    } else if (child) {
      var _fragments;
      (_fragments = fragments).push.apply(_fragments, getFragments(fontStore, child, attributes.link, level + 1));
    }
  }
  for (var _i = 0; _i < PREPROCESSORS.length; _i += 1) {
    var preprocessor = PREPROCESSORS[_i];
    fragments = preprocessor(fragments);
  }
  return fragments;
};

/**
 * Get textkit attributed string from text node
 *
 * @param {Object} fontStore font store
 * @param {Object} instance node
 * @returns {Object} attributed string
 */
var getAttributedString = function getAttributedString(fontStore, instance) {
  var fragments = getFragments(fontStore, instance);
  return fromFragments(fragments);
};

var engines = {
  bidi: bidi,
  linebreaker: linebreaker,
  justification: justification,
  textDecoration: textDecoration,
  scriptItemizer: scriptItemizer,
  wordHyphenation: wordHyphenation,
  fontSubstitution: fontSubstitution
};
var engine = layoutEngine(engines);
var getMaxLines = function getMaxLines(node) {
  var _node$style;
  return (_node$style = node.style) === null || _node$style === void 0 ? void 0 : _node$style.maxLines;
};
var getTextOverflow = function getTextOverflow(node) {
  var _node$style2;
  return (_node$style2 = node.style) === null || _node$style2 === void 0 ? void 0 : _node$style2.textOverflow;
};

/**
 * Get layout container for specific text node
 *
 * @param {number} width
 * @param {number} height
 * @param {Object} node
 * @returns {Object} layout container
 */
var getContainer = function getContainer(width, height, node) {
  var maxLines = getMaxLines(node);
  var textOverflow = getTextOverflow(node);
  return {
    x: 0,
    y: 0,
    width: width,
    maxLines: maxLines,
    height: height || Infinity,
    truncateMode: textOverflow
  };
};

/**
 * Get text layout options for specific text node
 *
 * @param {Object} node instance
 * @returns {Object} layout options
 */
var getLayoutOptions = function getLayoutOptions(fontStore, node) {
  return {
    hyphenationPenalty: node.props.hyphenationPenalty,
    shrinkWhitespaceFactor: {
      before: -0.5,
      after: -0.5
    },
    hyphenationCallback: node.props.hyphenationCallback || (fontStore === null || fontStore === void 0 ? void 0 : fontStore.getHyphenationCallback()) || null
  };
};

/**
 * Get text lines for given node
 *
 * @param {Object} node node
 * @param {number} width container width
 * @param {number} height container height
 * @param {number} fontStore font store
 * @returns {Object[]} layout lines
 */
var layoutText = function layoutText(node, width, height, fontStore) {
  var attributedString = getAttributedString(fontStore, node);
  var container = getContainer(width, height, node);
  var options = getLayoutOptions(fontStore, node);
  var lines = engine(attributedString, container, options);
  return lines.reduce(function (acc, line) {
    return [].concat(acc, line);
  }, []);
};

var isType$2 = function isType(type) {
  return function (node) {
    return node.type === type;
  };
};
var isSvg$2 = isType$2(P.Svg);
var isText$4 = isType$2(P.Text);
var shouldIterate = function shouldIterate(node) {
  return !isSvg$2(node) && !isText$4(node);
};
var shouldLayoutText = function shouldLayoutText(node) {
  return isText$4(node) && !node.lines;
};

/**
 * Performs text layout on text node if wasn't calculated before.
 * Text layout is usually performed on Yoga's layout process (via setMeasureFunc),
 * but we need to layout those nodes with fixed width and height.
 *
 * @param {Object} node
 * @returns {Object} layout node
 */
var resolveTextLayout = function resolveTextLayout(node, fontStore) {
  if (shouldLayoutText(node)) {
    var width = node.box.width - (node.box.paddingRight + node.box.paddingLeft);
    var height = node.box.height - (node.box.paddingTop + node.box.paddingBottom);

    // eslint-disable-next-line no-param-reassign
    node.lines = layoutText(node, width, height, fontStore);
  }
  if (shouldIterate(node)) {
    if (!node.children) return node;
    var mapChild = function mapChild(child) {
      return resolveTextLayout(child, fontStore);
    };
    var children = node.children.map(mapChild);
    return Object.assign({}, node, {
      children: children
    });
  }
  return node;
};

var BASE_INHERITABLE_PROPERTIES = ['color', 'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'letterSpacing', 'opacity', 'textDecoration', 'textTransform', 'lineHeight', 'textAlign', 'visibility', 'wordSpacing'];
var TEXT_INHERITABLE_PROPERTIES = [].concat(BASE_INHERITABLE_PROPERTIES, ['backgroundColor']);
var isSvg$1 = function isSvg(node) {
  return node.type === P.Svg;
};
var isText$3 = function isText(node) {
  return node.type === P.Text;
};

// Merge style values
var mergeValues = function mergeValues(styleName, value, inheritedValue) {
  switch (styleName) {
    case 'textDecoration':
      {
        // merge not none and not false textDecoration values to one rule
        return [inheritedValue, value].filter(function (v) {
          return v && v !== 'none';
        }).join(' ');
      }
    default:
      return value;
  }
};

// Merge inherited and node styles
var merge = function merge(inheritedStyles, style) {
  var mergedStyles = _extends({}, inheritedStyles);
  Object.entries(style).forEach(function (_ref) {
    var styleName = _ref[0],
      value = _ref[1];
    mergedStyles[styleName] = mergeValues(styleName, value, inheritedStyles[styleName]);
  });
  return mergedStyles;
};

/**
 * @typedef {Function} MergeStyles
 * @param {Object} node
 * @returns {Object} node with styles merged
 */

/**
 * Merges styles with node
 *
 * @param {Object} inheritedStyles style object
 * @returns {MergeStyles} merge styles function
 */
var mergeStyles = function mergeStyles(inheritedStyles) {
  return function (node) {
    var style = merge(inheritedStyles, node.style || {});
    return Object.assign({}, node, {
      style: style
    });
  };
};

/**
 * Inherit style values from the root to the leafs
 *
 * @param {Object} node document root
 * @returns {Object} document root with inheritance
 *
 */
var resolveInheritance = function resolveInheritance(node) {
  if (isSvg$1(node)) return node;
  if (!node.children) return node;
  var inheritableProperties = isText$3(node) ? TEXT_INHERITABLE_PROPERTIES : BASE_INHERITABLE_PROPERTIES;
  var inheritStyles = pick(inheritableProperties, node.style || {});
  var resolveChild = compose(resolveInheritance, mergeStyles(inheritStyles));
  var children = node.children.map(resolveChild);
  return Object.assign({}, node, {
    children: children
  });
};

var getComputedMargin = function getComputedMargin(node, edge) {
  var yogaNode = node.yogaNode;
  return yogaNode ? yogaNode.getComputedMargin(edge) : null;
};

/**
 * Get Yoga computed magins. Zero otherwise
 *
 * @param {Object} node
 * @returns {{ marginTop: number, marginRight: number, marginBottom: number, marginLeft: number }} margins
 */
var getMargin = function getMargin(node) {
  var style = node.style,
    box = node.box;
  var marginTop = getComputedMargin(node, Yoga.Edge.Top) || (box === null || box === void 0 ? void 0 : box.marginTop) || (style === null || style === void 0 ? void 0 : style.marginTop) || (style === null || style === void 0 ? void 0 : style.marginVertical) || (style === null || style === void 0 ? void 0 : style.margin) || 0;
  var marginRight = getComputedMargin(node, Yoga.Edge.Right) || (box === null || box === void 0 ? void 0 : box.marginRight) || (style === null || style === void 0 ? void 0 : style.marginRight) || (style === null || style === void 0 ? void 0 : style.marginHorizontal) || (style === null || style === void 0 ? void 0 : style.margin) || 0;
  var marginBottom = getComputedMargin(node, Yoga.Edge.Bottom) || (box === null || box === void 0 ? void 0 : box.marginBottom) || (style === null || style === void 0 ? void 0 : style.marginBottom) || (style === null || style === void 0 ? void 0 : style.marginVertical) || (style === null || style === void 0 ? void 0 : style.margin) || 0;
  var marginLeft = getComputedMargin(node, Yoga.Edge.Left) || (box === null || box === void 0 ? void 0 : box.marginLeft) || (style === null || style === void 0 ? void 0 : style.marginLeft) || (style === null || style === void 0 ? void 0 : style.marginHorizontal) || (style === null || style === void 0 ? void 0 : style.margin) || 0;
  return {
    marginTop: marginTop,
    marginRight: marginRight,
    marginBottom: marginBottom,
    marginLeft: marginLeft
  };
};

/**
 * Get Yoga computed position. Zero otherwise
 *
 * @param {Object} node
 * @returns {{ top: number, right: number, bottom: number, left: number }} position
 */
var getPosition = function getPosition(node) {
  var yogaNode = node.yogaNode;
  return {
    top: (yogaNode === null || yogaNode === void 0 ? void 0 : yogaNode.getComputedTop()) || 0,
    right: (yogaNode === null || yogaNode === void 0 ? void 0 : yogaNode.getComputedRight()) || 0,
    bottom: (yogaNode === null || yogaNode === void 0 ? void 0 : yogaNode.getComputedBottom()) || 0,
    left: (yogaNode === null || yogaNode === void 0 ? void 0 : yogaNode.getComputedLeft()) || 0
  };
};

var DEFAULT_DIMENSION = {
  width: 0,
  height: 0
};

/**
 * Get Yoga computed dimensions. Zero otherwise
 *
 * @param {Object} node
 * @returns {{ width: number, height: number }} dimensions
 */
var getDimension = function getDimension(node) {
  var yogaNode = node.yogaNode;
  if (!yogaNode) return DEFAULT_DIMENSION;
  return {
    width: yogaNode.getComputedWidth(),
    height: yogaNode.getComputedHeight()
  };
};

var getComputedBorder = function getComputedBorder(yogaNode, edge) {
  return yogaNode ? yogaNode.getComputedBorder(edge) : 0;
};

/**
 * Get Yoga computed border width. Zero otherwise
 *
 * @param {Object} node
 * @returns {{ borderTopWidth: number, borderRightWidth: number, borderBottomWidth: number, borderLeftWidth: number }} border widths
 */
var getBorderWidth = function getBorderWidth(node) {
  var yogaNode = node.yogaNode;
  return {
    borderTopWidth: getComputedBorder(yogaNode, Yoga.Edge.Top),
    borderRightWidth: getComputedBorder(yogaNode, Yoga.Edge.Right),
    borderBottomWidth: getComputedBorder(yogaNode, Yoga.Edge.Bottom),
    borderLeftWidth: getComputedBorder(yogaNode, Yoga.Edge.Left)
  };
};

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set display attribute to node's Yoga instance
 *
 * @param {string} value display
 * @returns {NodeInstanceWrapper} node instance wrapper
 */
var setDisplay = function setDisplay(value) {
  return function (node) {
    var yogaNode = node.yogaNode;
    if (yogaNode) {
      yogaNode.setDisplay(value === 'none' ? Yoga.Display.None : Yoga.Display.Flex);
    }
    return node;
  };
};

var OVERFLOW = {
  hidden: Yoga.Overflow.Hidden,
  scroll: Yoga.Overflow.Scroll
};

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set overflow attribute to node's Yoga instance
 *
 * @param {string} value overflow value
 * @returns {NodeInstanceWrapper} node instance wrapper
 */
var setOverflow = function setOverflow(value) {
  return function (node) {
    var yogaNode = node.yogaNode;
    if (!isNil(value) && yogaNode) {
      var overflow = OVERFLOW[value] || Yoga.Overflow.Visible;
      yogaNode.setOverflow(overflow);
    }
    return node;
  };
};

var FLEX_WRAP = {
  wrap: Yoga.Wrap.Wrap,
  'wrap-reverse': Yoga.Wrap.WrapReverse
};

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set flex wrap attribute to node's Yoga instance
 *
 * @param {string} value flex wrap value
 * @returns {NodeInstanceWrapper} node instance wrapper
 */
var setFlexWrap = function setFlexWrap(value) {
  return function (node) {
    var yogaNode = node.yogaNode;
    if (yogaNode) {
      var flexWrap = FLEX_WRAP[value] || Yoga.Wrap.NoWrap;
      yogaNode.setFlexWrap(flexWrap);
    }
    return node;
  };
};

/* eslint-disable no-unused-expressions */

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * @typedef {Function} YogaValueSetter
 * @param {any} value
 * @returns {NodeInstanceWrapper} node instance wrapper
 */

/**
 * Set generic yoga attribute to node's Yoga instance, handing `auto`, edges and percentage cases
 *
 * @param {string} attr property
 * @param {number} [edge] edge
 * @returns {YogaValueSetter} node instance wrapper
 */
var setYogaValue = function setYogaValue(attr, edge) {
  return function (value) {
    return function (node) {
      var yogaNode = node.yogaNode;
      if (!isNil(value) && yogaNode) {
        var hasEdge = !isNil(edge);
        var fixedMethod = "set" + upperFirst(attr);
        var autoMethod = fixedMethod + "Auto";
        var percentMethod = fixedMethod + "Percent";
        var percent = matchPercent(value);
        if (percent && !yogaNode[percentMethod]) {
          throw new Error("You can't pass percentage values to " + attr + " property");
        }
        if (percent) {
          if (hasEdge) {
            var _yogaNode$percentMeth;
            (_yogaNode$percentMeth = yogaNode[percentMethod]) === null || _yogaNode$percentMeth === void 0 ? void 0 : _yogaNode$percentMeth.call(yogaNode, edge, percent.value);
          } else {
            var _yogaNode$percentMeth2;
            (_yogaNode$percentMeth2 = yogaNode[percentMethod]) === null || _yogaNode$percentMeth2 === void 0 ? void 0 : _yogaNode$percentMeth2.call(yogaNode, percent.value);
          }
        } else if (value === 'auto') {
          if (hasEdge) {
            var _yogaNode$autoMethod;
            (_yogaNode$autoMethod = yogaNode[autoMethod]) === null || _yogaNode$autoMethod === void 0 ? void 0 : _yogaNode$autoMethod.call(yogaNode, edge);
          } else {
            var _yogaNode$autoMethod2;
            (_yogaNode$autoMethod2 = yogaNode[autoMethod]) === null || _yogaNode$autoMethod2 === void 0 ? void 0 : _yogaNode$autoMethod2.call(yogaNode);
          }
        } else if (hasEdge) {
          var _yogaNode$fixedMethod;
          (_yogaNode$fixedMethod = yogaNode[fixedMethod]) === null || _yogaNode$fixedMethod === void 0 ? void 0 : _yogaNode$fixedMethod.call(yogaNode, edge, value);
        } else {
          var _yogaNode$fixedMethod2;
          (_yogaNode$fixedMethod2 = yogaNode[fixedMethod]) === null || _yogaNode$fixedMethod2 === void 0 ? void 0 : _yogaNode$fixedMethod2.call(yogaNode, value);
        }
      }
      return node;
    };
  };
};

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set flex grow attribute to node's Yoga instance
 *
 * @param {number} value flex grow value
 * @returns {NodeInstanceWrapper} node instance wrapper
 */
var setFlexGrow = function setFlexGrow(value) {
  return function (node) {
    return setYogaValue('flexGrow')(value || 0)(node);
  };
};

/**
 * Set flex basis attribute to node's Yoga instance
 *
 * @param {number} flex basis value
 * @param {Object} node instance
 * @returns {Object} node instance
 */
var setFlexBasis = setYogaValue('flexBasis');

var ALIGN = {
  'flex-start': Yoga.Align.FlexStart,
  center: Yoga.Align.Center,
  'flex-end': Yoga.Align.FlexEnd,
  stretch: Yoga.Align.Stretch,
  baseline: Yoga.Align.Baseline,
  'space-between': Yoga.Align.SpaceBetween,
  'space-around': Yoga.Align.SpaceAround
};

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * @typedef {Function} AlignSetter
 * @param {string} value align value
 * @returns {NodeInstanceWrapper} node instance wrapper
 */

/**
 * Set generic align attribute to node's Yoga instance
 *
 * @param {string} attr specific align property
 * @returns {AlignSetter} align setter
 */
var setAlign = function setAlign(attr) {
  return function (value) {
    return function (node) {
      var yogaNode = node.yogaNode;
      var defaultValue = attr === 'items' ? Yoga.Align.Stretch : Yoga.Align.Auto;
      if (yogaNode) {
        var align = ALIGN[value] || defaultValue;
        yogaNode["setAlign" + upperFirst(attr)](align);
      }
      return node;
    };
  };
};

/**
 * Set align self attribute to node's Yoga instance
 *
 * @param {string} align value
 * @param {Object} node instance
 * @returns {Object} node instance
 */
var setAlignSelf = setAlign('self');

/**
 * Set align items attribute to node's Yoga instance
 *
 * @param {string} align value
 * @param {Object} node instance
 * @returns {Object} node instance
 */
var setAlignItems = setAlign('items');

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set flex shrink attribute to node's Yoga instance
 *
 * @param {number} value flex shrink value
 * @returns {NodeInstanceWrapper} node instance wrapper
 */
var setFlexShrink = function setFlexShrink(value) {
  return function (node) {
    return setYogaValue('flexShrink')(value || 1)(node);
  };
};

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set aspect ratio attribute to node's Yoga instance
 *
 * @param {number} value ratio
 * @returns {NodeInstanceWrapper} node instance wrapper
 */
var setAspectRatio = function setAspectRatio(value) {
  return function (node) {
    var yogaNode = node.yogaNode;
    if (!isNil(value) && yogaNode) {
      yogaNode.setAspectRatio(value);
    }
    return node;
  };
};

/**
 * Set align content attribute to node's Yoga instance
 *
 * @param {string} align value
 * @param {Object} node instance
 * @returns {Object} node instance
 */
var setAlignContent = setAlign('content');

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set position type attribute to node's Yoga instance
 *
 * @param {string} value position position type
 * @returns {NodeInstanceWrapper} node instance wrapper
 */
var setPositionType = function setPositionType(value) {
  return function (node) {
    var yogaNode = node.yogaNode;
    if (!isNil(value) && yogaNode) {
      yogaNode.setPositionType(value === 'absolute' ? Yoga.PositionType.Absolute : Yoga.PositionType.Relative);
    }
    return node;
  };
};

var FLEX_DIRECTIONS = {
  row: Yoga.FlexDirection.Row,
  'row-reverse': Yoga.FlexDirection.RowReverse,
  'column-reverse': Yoga.FlexDirection.ColumnReverse
};

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set flex direction attribute to node's Yoga instance
 *
 * @param {string} value flex direction value
 * @returns {NodeInstanceWrapper} node instance wrapper
 */
var setFlexDirection = function setFlexDirection(value) {
  return function (node) {
    var yogaNode = node.yogaNode;
    if (yogaNode) {
      var flexDirection = FLEX_DIRECTIONS[value] || Yoga.FlexDirection.Column;
      yogaNode.setFlexDirection(flexDirection);
    }
    return node;
  };
};

var JUSTIFY_CONTENT = {
  center: Yoga.Justify.Center,
  'flex-end': Yoga.Justify.FlexEnd,
  'space-between': Yoga.Justify.SpaceBetween,
  'space-around': Yoga.Justify.SpaceAround,
  'space-evenly': Yoga.Justify.SpaceEvenly
};

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set justify content attribute to node's Yoga instance
 *
 * @param {string} value justify content value
 * @returns {NodeInstanceWrapper} node instance wrapper
 */
var setJustifyContent = function setJustifyContent(value) {
  return function (node) {
    var yogaNode = node.yogaNode;
    if (!isNil(value) && yogaNode) {
      var justifyContent = JUSTIFY_CONTENT[value] || Yoga.Justify.FlexStart;
      yogaNode.setJustifyContent(justifyContent);
    }
    return node;
  };
};

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set margin top attribute to node's Yoga instance
 *
 * @param {number} margin margin top
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setMarginTop = setYogaValue('margin', Yoga.Edge.Top);

/**
 * Set margin right attribute to node's Yoga instance
 *
 * @param {number} margin margin right
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setMarginRight = setYogaValue('margin', Yoga.Edge.Right);

/**
 * Set margin bottom attribute to node's Yoga instance
 *
 * @param {number} margin margin bottom
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setMarginBottom = setYogaValue('margin', Yoga.Edge.Bottom);

/**
 * Set margin left attribute to node's Yoga instance
 *
 * @param {number} margin margin left
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setMarginLeft = setYogaValue('margin', Yoga.Edge.Left);

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set padding top attribute to node's Yoga instance
 *
 * @param {number} padding padding top
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setPaddingTop = setYogaValue('padding', Yoga.Edge.Top);

/**
 * Set padding right attribute to node's Yoga instance
 *
 * @param {number} padding padding right
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setPaddingRight = setYogaValue('padding', Yoga.Edge.Right);

/**
 * Set padding bottom attribute to node's Yoga instance
 *
 * @param {number} padding padding bottom
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setPaddingBottom = setYogaValue('padding', Yoga.Edge.Bottom);

/**
 * Set padding left attribute to node's Yoga instance
 *
 * @param {number} padding padding left
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setPaddingLeft = setYogaValue('padding', Yoga.Edge.Left);

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set border top attribute to node's Yoga instance
 *
 * @param {number} border border top width
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setBorderTop = setYogaValue('border', Yoga.Edge.Top);

/**
 * Set border right attribute to node's Yoga instance
 *
 * @param {number} border border right width
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setBorderRight = setYogaValue('border', Yoga.Edge.Right);

/**
 * Set border bottom attribute to node's Yoga instance
 *
 * @param {number} border border bottom width
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setBorderBottom = setYogaValue('border', Yoga.Edge.Bottom);

/**
 * Set border left attribute to node's Yoga instance
 *
 * @param {number} border border left width
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setBorderLeft = setYogaValue('border', Yoga.Edge.Left);

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Set position top attribute to node's Yoga instance
 *
 * @param {number} position position top
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setPositionTop = setYogaValue('position', Yoga.Edge.Top);

/**
 * Set position right attribute to node's Yoga instance
 *
 * @param {number} position position right
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setPositionRight = setYogaValue('position', Yoga.Edge.Right);

/**
 * Set position bottom attribute to node's Yoga instance
 *
 * @param {number} position position bottom
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setPositionBottom = setYogaValue('position', Yoga.Edge.Bottom);

/**
 * Set position left attribute to node's Yoga instance
 *
 * @param {number} position position left
 * @param {Object} node node instance
 * @returns {Object} node instance
 */
var setPositionLeft = setYogaValue('position', Yoga.Edge.Left);

/**
 * Set width to node's Yoga instance
 *
 * @param {number} width
 * @param {Object} node instance
 * @returns {Object} node instance
 */
var setWidth = setYogaValue('width');

/**
 * Set min width to node's Yoga instance
 *
 * @param {number} min width
 * @param {Object} node instance
 * @returns {Object} node instance
 */
var setMinWidth = setYogaValue('minWidth');

/**
 * Set max width to node's Yoga instance
 *
 * @param {number} max width
 * @param {Object} node instance
 * @returns {Object} node instance
 */
var setMaxWidth = setYogaValue('maxWidth');

/**
 * Set height to node's Yoga instance
 *
 * @param {number} height
 * @param {Object} node instance
 * @returns {Object} node instance
 */
var setHeight = setYogaValue('height');

/**
 * Set min height to node's Yoga instance
 *
 * @param {number} min height
 * @param {Object} node instance
 * @returns {Object} node instance
 */
var setMinHeight = setYogaValue('minHeight');

/**
 * Set max height to node's Yoga instance
 *
 * @param {number} max height
 * @param {Object} node instance
 * @returns {Object} node instance
 */
var setMaxHeight = setYogaValue('maxHeight');

/**
 * @typedef {Function} NodeInstanceWrapper
 * @param {Object} node node instance
 * @returns {Object} node instance
 */

/**
 * Check if value is a percentage and throw error if so
 *
 * @param {string} attr property
 * @param {unknown} value
 * @returns {void}
 */
var checkPercents = function checkPercents(attr, value) {
  var percent = matchPercent(value);
  if (percent) {
    throw new Error("You can't pass percentage values to " + attr + " property");
  }
};

/**
 * Set rowGap value to node's Yoga instance
 *
 * @param {number} value gap value
 * @returns {NodeInstanceWrapper} node instance wrapper
 */
var setRowGap = function setRowGap(value) {
  return function (node) {
    var yogaNode = node.yogaNode;
    if (!isNil(value) && yogaNode) {
      checkPercents('rowGap', value);
      yogaNode.setGap(Yoga.Gutter.Row, value);
    }
    return node;
  };
};

/**
 * Set columnGap value to node's Yoga instance
 *
 * @param {number} value gap value
 * @returns {NodeInstanceWrapper} node instance wrapper
 */
var setColumnGap = function setColumnGap(value) {
  return function (node) {
    var yogaNode = node.yogaNode;
    if (!isNil(value) && yogaNode) {
      checkPercents('columnGap', value);
      yogaNode.setGap(Yoga.Gutter.Column, value);
    }
    return node;
  };
};

var getAspectRatio = function getAspectRatio(viewbox) {
  if (!viewbox) return null;
  return (viewbox.maxX - viewbox.minX) / (viewbox.maxY - viewbox.minY);
};

/**
 * @typedef {Function} MeasureSvg
 * @param {number} width
 * @param {number} widthMode
 * @param {number} height
 * @param {number} heightMode
 * @returns {{ width: number, height: number }} svg width and height
 */

/**
 * Yoga svg measure function
 *
 * @param {Object} page
 * @param {Object} node
 * @returns {MeasureSvg} measure svg
 */
var measureCanvas$1 = function measureCanvas(page, node) {
  return function (width, widthMode, height, heightMode) {
    var aspectRatio = getAspectRatio(node.props.viewBox) || 1;
    if (widthMode === Yoga.MeasureMode.Exactly || widthMode === Yoga.MeasureMode.AtMost) {
      return {
        width: width,
        height: width / aspectRatio
      };
    }
    if (heightMode === Yoga.MeasureMode.Exactly) {
      return {
        width: height * aspectRatio
      };
    }
    return {};
  };
};

/**
 * Get lines width (if any)
 *
 * @param {Object} node
 * @returns {number} lines width
 */
var linesWidth = function linesWidth(node) {
  if (!node.lines) return 0;
  return Math.max.apply(Math, [0].concat(node.lines.map(function (line) {
    return line.xAdvance;
  })));
};

/**
 * Get lines height (if any)
 *
 * @param {Object} node
 * @returns {number} lines height
 */
var linesHeight = function linesHeight(node) {
  if (!node.lines) return -1;
  return node.lines.reduce(function (acc, line) {
    return acc + line.box.height;
  }, 0);
};

/* eslint-disable no-param-reassign */

var ALIGNMENT_FACTORS = {
  center: 0.5,
  right: 1
};

/**
 * @typedef {Function} MeasureText
 * @param {number} width
 * @param {number} widthMode
 * @param {number} height
 * @returns {{ width: number, height: number }} text width and height
 */

/**
 * Yoga text measure function
 *
 * @param {Object} page
 * @param {Object} node
 * @param {Object} fontStore
 * @returns {MeasureText} measure text function
 */
var measureText = function measureText(page, node, fontStore) {
  return function (width, widthMode, height) {
    if (widthMode === Yoga.MeasureMode.Exactly) {
      if (!node.lines) node.lines = layoutText(node, width, height, fontStore);
      return {
        height: linesHeight(node)
      };
    }
    if (widthMode === Yoga.MeasureMode.AtMost) {
      var _node$style;
      var alignFactor = ALIGNMENT_FACTORS[(_node$style = node.style) === null || _node$style === void 0 ? void 0 : _node$style.textAlign] || 0;
      if (!node.lines) {
        node.lines = layoutText(node, width, height, fontStore);
        node.alignOffset = (width - linesWidth(node)) * alignFactor; // Compensate align in variable width containers
      }
      return {
        height: linesHeight(node),
        width: Math.min(width, linesWidth(node))
      };
    }
    return {};
  };
};

/**
 * Get image ratio
 *
 * @param {Object} node image node
 * @returns {number} image ratio
 */
var getRatio = function getRatio(node) {
  var _node$image;
  return (_node$image = node.image) !== null && _node$image !== void 0 && _node$image.data ? node.image.width / node.image.height : 1;
};

/**
 * Checks if page has auto height
 *
 * @param {Object} page
 * @returns {boolean} is page height auto
 */
var isHeightAuto = function isHeightAuto(page) {
  var _page$box;
  return isNil((_page$box = page.box) === null || _page$box === void 0 ? void 0 : _page$box.height);
};

var SAFETY_HEIGHT$1 = 10;

/**
 * @typedef {Function} MeasureImage
 * @param {number} width
 * @param {number} widthMode
 * @param {number} height
 * @param {number} heightMode
 * @returns {{ width: number, height: number }} image width and height
 */

/**
 * Yoga image measure function
 *
 * @param {Object} page page
 * @param {Object} node node
 * @returns {MeasureImage} measure image
 */
var measureImage = function measureImage(page, node) {
  return function (width, widthMode, height, heightMode) {
    var imageRatio = getRatio(node);
    var imageMargin = getMargin(node);
    var pagePadding = getPadding(page);
    var pageArea = isHeightAuto(page) ? Infinity : page.box.height - pagePadding.paddingTop - pagePadding.paddingBottom - imageMargin.marginTop - imageMargin.marginBottom - SAFETY_HEIGHT$1;

    // Skip measure if image data not present yet
    if (!node.image) return {
      width: 0,
      height: 0
    };
    if (widthMode === Yoga.MeasureMode.Exactly && heightMode === Yoga.MeasureMode.Undefined) {
      var scaledHeight = width / imageRatio;
      return {
        height: Math.min(pageArea, scaledHeight)
      };
    }
    if (heightMode === Yoga.MeasureMode.Exactly && (widthMode === Yoga.MeasureMode.AtMost || widthMode === Yoga.MeasureMode.Undefined)) {
      return {
        width: Math.min(height * imageRatio, width)
      };
    }
    if (widthMode === Yoga.MeasureMode.Exactly && heightMode === Yoga.MeasureMode.AtMost) {
      var _scaledHeight = width / imageRatio;
      return {
        height: Math.min(height, pageArea, _scaledHeight)
      };
    }
    if (widthMode === Yoga.MeasureMode.AtMost && heightMode === Yoga.MeasureMode.AtMost) {
      if (imageRatio > 1) {
        return {
          width: width,
          height: Math.min(width / imageRatio, height)
        };
      }
      return {
        height: height,
        width: Math.min(height * imageRatio, width)
      };
    }
    return {
      height: height,
      width: width
    };
  };
};

/* eslint-disable no-param-reassign */

var SAFETY_HEIGHT = 10;
var getMax = function getMax(values) {
  return Math.max.apply(Math, [-Infinity].concat(values));
};

/**
 * Helper object to predict canvas size
 * TODO: Implement remaining functions (as close as possible);
 */
var measureCtx = function measureCtx() {
  var ctx = {};
  var points = [];
  var nil = function nil() {
    return ctx;
  };
  var addPoint = function addPoint(x, y) {
    return points.push([x, y]);
  };
  var moveTo = function moveTo() {
    addPoint.apply(void 0, arguments);
    return ctx;
  };
  var rect = function rect(x, y, w, h) {
    addPoint(x, y);
    addPoint(x + w, y);
    addPoint(x, y + h);
    addPoint(x + w, y + h);
    return ctx;
  };
  var ellipse = function ellipse(x, y, rx, ry) {
    ry = ry || rx;
    addPoint(x - rx, y - ry);
    addPoint(x + rx, y - ry);
    addPoint(x + rx, y + ry);
    addPoint(x - rx, y + ry);
    return ctx;
  };
  var polygon = function polygon() {
    points.push.apply(points, arguments);
    return ctx;
  };

  // Change dimensions
  ctx.rect = rect;
  ctx.moveTo = moveTo;
  ctx.lineTo = moveTo;
  ctx.circle = ellipse;
  ctx.polygon = polygon;
  ctx.ellipse = ellipse;
  ctx.roundedRect = rect;

  // To be implemented
  ctx.text = nil;
  ctx.path = nil;
  ctx.lineWidth = nil;
  ctx.bezierCurveTo = nil;
  ctx.quadraticCurveTo = nil;
  ctx.scale = nil;
  ctx.rotate = nil;
  ctx.translate = nil;

  // These don't change dimensions
  ctx.dash = nil;
  ctx.clip = nil;
  ctx.save = nil;
  ctx.fill = nil;
  ctx.font = nil;
  ctx.stroke = nil;
  ctx.lineCap = nil;
  ctx.opacity = nil;
  ctx.restore = nil;
  ctx.lineJoin = nil;
  ctx.fontSize = nil;
  ctx.fillColor = nil;
  ctx.miterLimit = nil;
  ctx.strokeColor = nil;
  ctx.fillOpacity = nil;
  ctx.strokeOpacity = nil;
  ctx.linearGradient = nil;
  ctx.radialGradient = nil;
  ctx.getWidth = function () {
    return getMax(points.map(function (p) {
      return p[0];
    }));
  };
  ctx.getHeight = function () {
    return getMax(points.map(function (p) {
      return p[1];
    }));
  };
  return ctx;
};

/**
 * @typedef {Function} MeasureCanvas
 * @returns {{ width: number, height: number }} canvas width and height
 */

/**
 * Yoga canvas measure function
 *
 * @param {Object} page
 * @param {Object} node
 * @returns {MeasureCanvas} measure canvas
 */
var measureCanvas = function measureCanvas(page, node) {
  return function () {
    var imageMargin = getMargin(node);
    var pagePadding = getPadding(page);
    var pageArea = isHeightAuto(page) ? Infinity : page.box.height - pagePadding.paddingTop - pagePadding.paddingBottom - imageMargin.marginTop - imageMargin.marginBottom - SAFETY_HEIGHT;
    var ctx = measureCtx();
    node.props.paint(ctx);
    var width = ctx.getWidth();
    var height = Math.min(pageArea, ctx.getHeight());
    return {
      width: width,
      height: height
    };
  };
};

var isType$1 = function isType(type) {
  return function (node) {
    return node.type === type;
  };
};
var isSvg = isType$1(P.Svg);
var isText$2 = isType$1(P.Text);
var isNote = isType$1(P.Note);
var isPage = isType$1(P.Page);
var isImage = isType$1(P.Image);
var isCanvas = isType$1(P.Canvas);
var isTextInstance$1 = isType$1(P.TextInstance);
var setNodeHeight = function setNodeHeight(node) {
  var value = isPage(node) ? node.box.height : node.style.height;
  return setHeight(value);
};

/**
 * Set styles valeus into yoga node before layout calculation
 *
 * @param {Object} node
 * @returns {Object} node
 */
var setYogaValues = function setYogaValues(node) {
  compose(setNodeHeight(node), setWidth(node.style.width), setMinWidth(node.style.minWidth), setMaxWidth(node.style.maxWidth), setMinHeight(node.style.minHeight), setMaxHeight(node.style.maxHeight), setMarginTop(node.style.marginTop), setMarginRight(node.style.marginRight), setMarginBottom(node.style.marginBottom), setMarginLeft(node.style.marginLeft), setPaddingTop(node.style.paddingTop), setPaddingRight(node.style.paddingRight), setPaddingBottom(node.style.paddingBottom), setPaddingLeft(node.style.paddingLeft), setPositionType(node.style.position), setPositionTop(node.style.top), setPositionRight(node.style.right), setPositionBottom(node.style.bottom), setPositionLeft(node.style.left), setBorderTop(node.style.borderTopWidth), setBorderRight(node.style.borderRightWidth), setBorderBottom(node.style.borderBottomWidth), setBorderLeft(node.style.borderLeftWidth), setDisplay(node.style.display), setFlexDirection(node.style.flexDirection), setAlignSelf(node.style.alignSelf), setAlignContent(node.style.alignContent), setAlignItems(node.style.alignItems), setJustifyContent(node.style.justifyContent), setFlexWrap(node.style.flexWrap), setOverflow(node.style.overflow), setAspectRatio(node.style.aspectRatio), setFlexBasis(node.style.flexBasis), setFlexGrow(node.style.flexGrow), setFlexShrink(node.style.flexShrink), setRowGap(node.style.rowGap), setColumnGap(node.style.columnGap))(node);
};

/**
 * @typedef {Function} InsertYogaNodes
 * @param {Object} child child node
 * @returns {Object} node
 */

/**
 * Inserts child into parent' yoga node
 *
 * @param {Object} parent parent
 * @returns {InsertYogaNodes} insert yoga nodes
 */
var insertYogaNodes = function insertYogaNodes(parent) {
  return function (child) {
    parent.insertChild(child.yogaNode, parent.getChildCount());
    return child;
  };
};
var setMeasureFunc = function setMeasureFunc(node, page, fontStore) {
  var yogaNode = node.yogaNode;
  if (isText$2(node)) {
    yogaNode.setMeasureFunc(measureText(page, node, fontStore));
  }
  if (isImage(node)) {
    yogaNode.setMeasureFunc(measureImage(page, node));
  }
  if (isCanvas(node)) {
    yogaNode.setMeasureFunc(measureCanvas(page, node));
  }
  if (isSvg(node)) {
    yogaNode.setMeasureFunc(measureCanvas$1(page, node));
  }
  return node;
};
var isLayoutElement = function isLayoutElement(node) {
  return !isText$2(node) && !isNote(node) && !isSvg(node);
};

/**
 * @typedef {Function} CreateYogaNodes
 * @param {Object} node
 * @returns {Object} node with appended yoga node
 */

/**
 * Creates and add yoga node to document tree
 * Handles measure function for text and image nodes
 *
 * @returns {CreateYogaNodes} create yoga nodes
 */
var createYogaNodes = function createYogaNodes(page, fontStore, yoga) {
  return function (node) {
    var yogaNode = yoga.node.create();
    var result = Object.assign({}, node, {
      yogaNode: yogaNode
    });
    setYogaValues(result);
    if (isLayoutElement(node) && node.children) {
      var resolveChild = compose(insertYogaNodes(yogaNode), createYogaNodes(page, fontStore, yoga));
      result.children = node.children.map(resolveChild);
    }
    setMeasureFunc(result, page, fontStore);
    return result;
  };
};

/**
 * Performs yoga calculation
 *
 * @param {Object} page page node
 * @returns {Object} page node
 */
var calculateLayout = function calculateLayout(page) {
  page.yogaNode.calculateLayout();
  return page;
};

/**
 * Saves Yoga layout result into 'box' attribute of node
 *
 * @param {Object} node
 * @returns {Object} node with box data
 */
var persistDimensions = function persistDimensions(node) {
  if (isTextInstance$1(node)) return node;
  var box = Object.assign(getPadding(node), getMargin(node), getBorderWidth(node), getPosition(node), getDimension(node));
  var newNode = Object.assign({}, node, {
    box: box
  });
  if (!node.children) return newNode;
  var children = node.children.map(persistDimensions);
  return Object.assign({}, newNode, {
    children: children
  });
};

/**
 * Removes yoga node from document tree
 *
 * @param {Object} node
 * @returns {Object} node without yoga node
 */
var destroyYogaNodes = function destroyYogaNodes(node) {
  var newNode = Object.assign({}, node);
  delete newNode.yogaNode;
  if (!node.children) return newNode;
  var children = node.children.map(destroyYogaNodes);
  return Object.assign({}, newNode, {
    children: children
  });
};

/**
 * Free yoga node from document tree
 *
 * @param {Object} node
 * @returns {Object} node without yoga node
 */
var freeYogaNodes = function freeYogaNodes(node) {
  if (node.yogaNode) node.yogaNode.freeRecursive();
  return node;
};

/**
 * Calculates page object layout using Yoga.
 * Takes node values from 'box' and 'style' attributes, and persist them back into 'box'
 * Destroy yoga values at the end.
 *
 * @param {Object} page object
 * @returns {Object} page object with correct 'box' layout attributes
 */
var resolvePageDimensions = function resolvePageDimensions(page, fontStore, yoga) {
  if (isNil(page)) return null;
  return compose(destroyYogaNodes, freeYogaNodes, persistDimensions, calculateLayout, createYogaNodes(page, fontStore, yoga))(page);
};

/**
 * Calculates root object layout using Yoga.
 *
 * @param {Object} node root object
 * @param {Object} fontStore font store
 * @returns {Object} root object with correct 'box' layout attributes
 */
var resolveDimensions = function resolveDimensions(node, fontStore) {
  if (!node.children) return node;
  var resolveChild = function resolveChild(child) {
    return resolvePageDimensions(child, fontStore, node.yoga);
  };
  var children = node.children.map(resolveChild);
  return Object.assign({}, node, {
    children: children
  });
};

var isText$1 = function isText(node) {
  return node.type === P.Text;
};

// Prevent splitting elements by low decimal numbers
var SAFETY_THRESHOLD = 0.001;
var assingChildren = function assingChildren(children, node) {
  return Object.assign({}, node, {
    children: children
  });
};
var getTop = function getTop(node) {
  var _node$box;
  return ((_node$box = node.box) === null || _node$box === void 0 ? void 0 : _node$box.top) || 0;
};
var allFixed = function allFixed(nodes) {
  return nodes.every(isFixed);
};
var isDynamic = function isDynamic(node) {
  var _node$props;
  return !isNil((_node$props = node.props) === null || _node$props === void 0 ? void 0 : _node$props.render);
};
var relayoutPage = compose(resolveTextLayout, resolvePageDimensions, resolveInheritance, resolvePageStyles);
var warnUnavailableSpace = function warnUnavailableSpace(node) {
  console.warn("Node of type " + node.type + " can't wrap between pages and it's bigger than available page height");
};
var splitNodes = function splitNodes(height, contentArea, nodes) {
  var currentChildren = [];
  var nextChildren = [];
  for (var i = 0; i < nodes.length; i += 1) {
    var child = nodes[i];
    var futureNodes = nodes.slice(i + 1);
    var futureFixedNodes = futureNodes.filter(isFixed);
    var nodeTop = getTop(child);
    var nodeHeight = child.box.height;
    var isOutside = height <= nodeTop;
    var shouldBreak$1 = shouldBreak(child, futureNodes, height);
    var shouldSplit = height + SAFETY_THRESHOLD < nodeTop + nodeHeight;
    var canWrap = getWrap(child);
    var fitsInsidePage = nodeHeight <= contentArea;
    if (isFixed(child)) {
      nextChildren.push(child);
      currentChildren.push(child);
      continue;
    }
    if (isOutside) {
      var box = Object.assign({}, child.box, {
        top: child.box.top - height
      });
      var next = Object.assign({}, child, {
        box: box
      });
      nextChildren.push(next);
      continue;
    }
    if (!fitsInsidePage && !canWrap) {
      currentChildren.push(child);
      nextChildren.push.apply(nextChildren, futureNodes);
      warnUnavailableSpace(child);
      break;
    }
    if (shouldBreak$1) {
      var _box = Object.assign({}, child.box, {
        top: child.box.top - height
      });
      var props = Object.assign({}, child.props, {
        wrap: true,
        break: false
      });
      var _next = Object.assign({}, child, {
        box: _box,
        props: props
      });
      currentChildren.push.apply(currentChildren, futureFixedNodes);
      nextChildren.push.apply(nextChildren, [_next].concat(futureNodes));
      break;
    }
    if (shouldSplit) {
      var _split = split(child, height, contentArea),
        currentChild = _split[0],
        nextChild = _split[1];

      // All children are moved to the next page, it doesn't make sense to show the parent on the current page
      if (child.children.length > 0 && currentChild.children.length === 0) {
        var _box2 = Object.assign({}, child.box, {
          top: child.box.top - height
        });
        var _next2 = Object.assign({}, child, {
          box: _box2
        });
        currentChildren.push.apply(currentChildren, futureFixedNodes);
        nextChildren.push.apply(nextChildren, [_next2].concat(futureNodes));
        break;
      }
      if (currentChild) currentChildren.push(currentChild);
      if (nextChild) nextChildren.push(nextChild);
      continue;
    }
    currentChildren.push(child);
  }
  return [currentChildren, nextChildren];
};
var splitChildren = function splitChildren(height, contentArea, node) {
  var children = node.children || [];
  var availableHeight = height - getTop(node);
  return splitNodes(availableHeight, contentArea, children);
};
var splitView = function splitView(node, height, contentArea) {
  var _splitNode = splitNode(node, height),
    currentNode = _splitNode[0],
    nextNode = _splitNode[1];
  var _splitChildren = splitChildren(height, contentArea, node),
    currentChilds = _splitChildren[0],
    nextChildren = _splitChildren[1];
  return [assingChildren(currentChilds, currentNode), assingChildren(nextChildren, nextNode)];
};
var split = function split(node, height, contentArea) {
  return isText$1(node) ? splitText(node, height) : splitView(node, height, contentArea);
};
var shouldResolveDynamicNodes = function shouldResolveDynamicNodes(node) {
  var children = node.children || [];
  return isDynamic(node) || children.some(shouldResolveDynamicNodes);
};
var resolveDynamicNodes = function resolveDynamicNodes(props, node) {
  var isNodeDynamic = isDynamic(node);

  // Call render prop on dynamic nodes and append result to children
  var resolveChildren = function resolveChildren(children) {
    if (children === void 0) {
      children = [];
    }
    if (isNodeDynamic) {
      var res = node.props.render(props);
      return createInstances(res).filter(Boolean).map(function (n) {
        return resolveDynamicNodes(props, n);
      });
    }
    return children.map(function (c) {
      return resolveDynamicNodes(props, c);
    });
  };

  // We reset dynamic text box so it can be computed again later on
  var resetHeight = isNodeDynamic && isText$1(node);
  var box = resetHeight ? _extends({}, node.box, {
    height: 0
  }) : node.box;
  var children = resolveChildren(node.children);
  var lines = isNodeDynamic ? null : node.lines;
  return Object.assign({}, node, {
    box: box,
    lines: lines,
    children: children
  });
};
var resolveDynamicPage = function resolveDynamicPage(props, page, fontStore, yoga) {
  if (shouldResolveDynamicNodes(page)) {
    var resolvedPage = resolveDynamicNodes(props, page);
    return relayoutPage(resolvedPage, fontStore, yoga);
  }
  return page;
};
var splitPage = function splitPage(page, pageNumber, fontStore, yoga) {
  var wrapArea = getWrapArea(page);
  var contentArea = getContentArea(page);
  var dynamicPage = resolveDynamicPage({
    pageNumber: pageNumber
  }, page, fontStore, yoga);
  var height = page.style.height;
  var _splitNodes = splitNodes(wrapArea, contentArea, dynamicPage.children),
    currentChilds = _splitNodes[0],
    nextChilds = _splitNodes[1];
  var relayout = function relayout(node) {
    return relayoutPage(node, fontStore, yoga);
  };
  var currentBox = _extends({}, page.box, {
    height: height
  });
  var currentPage = relayout(Object.assign({}, page, {
    box: currentBox,
    children: currentChilds
  }));
  if (nextChilds.length === 0 || allFixed(nextChilds)) return [currentPage, null];
  var nextBox = omit('height', page.box);
  var nextProps = omit('bookmark', page.props);
  var nextPage = relayout(Object.assign({}, page, {
    props: nextProps,
    box: nextBox,
    children: nextChilds
  }));
  return [currentPage, nextPage];
};
var resolvePageIndices = function resolvePageIndices(fontStore, yoga, page, pageNumber, pages) {
  var totalPages = pages.length;
  var props = {
    totalPages: totalPages,
    pageNumber: pageNumber + 1,
    subPageNumber: page.subPageNumber + 1,
    subPageTotalPages: page.subPageTotalPages
  };
  return resolveDynamicPage(props, page, fontStore, yoga);
};
var assocSubPageData = function assocSubPageData(subpages) {
  return subpages.map(function (page, i) {
    return _extends({}, page, {
      subPageNumber: i,
      subPageTotalPages: subpages.length
    });
  });
};
var dissocSubPageData = function dissocSubPageData(page) {
  return omit(['subPageNumber', 'subPageTotalPages'], page);
};
var paginate = function paginate(page, pageNumber, fontStore, yoga) {
  var _page$props;
  if (!page) return [];
  if (((_page$props = page.props) === null || _page$props === void 0 ? void 0 : _page$props.wrap) === false) return [page];
  var splittedPage = splitPage(page, pageNumber, fontStore, yoga);
  var pages = [splittedPage[0]];
  var nextPage = splittedPage[1];
  while (nextPage !== null) {
    splittedPage = splitPage(nextPage, pageNumber + pages.length, fontStore, yoga);
    pages.push(splittedPage[0]);
    nextPage = splittedPage[1];
  }
  return pages;
};

/**
 * Performs pagination. This is the step responsible of breaking the whole document
 * into pages following pagiation rules, such as `fixed`, `break` and dynamic nodes.
 *
 * @param {Object} doc node
 * @param {Object} fontStore font store
 * @returns {Object} layout node
 */
var resolvePagination = function resolvePagination(doc, fontStore) {
  var pages = [];
  var pageNumber = 1;
  for (var i = 0; i < doc.children.length; i += 1) {
    var page = doc.children[i];
    var subpages = paginate(page, pageNumber, fontStore, doc.yoga);
    subpages = assocSubPageData(subpages);
    pageNumber += subpages.length;
    pages = pages.concat(subpages);
  }
  pages = pages.map(function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return dissocSubPageData(resolvePageIndices.apply(void 0, [fontStore, doc.yoga].concat(args)));
  });
  return assingChildren(pages, doc);
};

/**
 * @typedef {Function} ResolvePageHorizontalPadding
 * @param {string} value padding value
 * @returns {Object} translated padding value
 */

/**
 * Translates page percentage horizontal paddings in fixed ones
 *
 * @param {Object} container page container
 * @returns {ResolvePageHorizontalPadding} resolve page horizontal padding
 */
var resolvePageHorizontalPadding = function resolvePageHorizontalPadding(container) {
  return function (value) {
    var match = matchPercent(value);
    return match ? match.percent * container.width : value;
  };
};

/**
 * @typedef {Function} ResolvePageVerticalPadding
 * @param {string} padding value
 * @returns {Object} translated padding value
 */

/**
 * Translates page percentage vertical paddings in fixed ones
 *
 * @param {Object} container page container
 * @returns {ResolvePageVerticalPadding} resolve page vertical padding
 */
var resolvePageVerticalPadding = function resolvePageVerticalPadding(container) {
  return function (value) {
    var match = matchPercent(value);
    return match ? match.percent * container.height : value;
  };
};

/**
 * Translates page percentage paddings in fixed ones
 *
 * @param {Object} page
 * @returns {Object} page with fixed paddings
 */
var resolvePagePaddings = function resolvePagePaddings(page) {
  var container = page.style;
  var style = evolve({
    paddingTop: resolvePageVerticalPadding(container),
    paddingLeft: resolvePageHorizontalPadding(container),
    paddingRight: resolvePageHorizontalPadding(container),
    paddingBottom: resolvePageVerticalPadding(container)
  }, page.style);
  return Object.assign({}, page, {
    style: style
  });
};

/**
 * Translates all pages percentage paddings in fixed ones
 * This has to be computed from pages calculated size and not by Yoga
 * because at this point we didn't performed pagination yet.
 *
 * @param {Object} root document root
 * @returns {Object} document root with translated page paddings
 */
var resolvePagesPaddings = function resolvePagesPaddings(root) {
  if (!root.children) return root;
  var children = root.children.map(resolvePagePaddings);
  return Object.assign({}, root, {
    children: children
  });
};

/**
 * @typedef {Function} ResolveRadius
 * @param {string | number} value border radius value
 * @returns {number} resolved radius value
 */

/**
 *
 * @param {{ width: number, height: number }} container width and height
 * @returns {ResolveRadius} resolve radius function
 */
var resolveRadius = function resolveRadius(container) {
  return function (value) {
    if (!value) return undefined;
    var match = matchPercent(value);
    return match ? match.percent * Math.min(container.width, container.height) : value;
  };
};

/**
 * Transforms percent border radius into fixed values
 *
 * @param {Object} node
 * @returns {Object} node
 */
var resolvePercentRadius = function resolvePercentRadius(node) {
  var style = evolve({
    borderTopLeftRadius: resolveRadius(node.box),
    borderTopRightRadius: resolveRadius(node.box),
    borderBottomRightRadius: resolveRadius(node.box),
    borderBottomLeftRadius: resolveRadius(node.box)
  }, node.style || {});
  var newNode = Object.assign({}, node, {
    style: style
  });
  if (!node.children) return newNode;
  var children = node.children.map(resolvePercentRadius);
  return Object.assign({}, newNode, {
    children: children
  });
};

/**
 * Transform percent height into fixed
 *
 * @param {number} height
 * @returns {number} height
 */
var transformHeight = function transformHeight(pageArea, height) {
  var match = matchPercent(height);
  return match ? match.percent * pageArea : height;
};

/**
 * Get page area (height minus paddings)
 *
 * @param {Object} page
 * @returns {number} page area
 */
var getPageArea = function getPageArea(page) {
  var _page$style, _page$style2;
  var pageHeight = page.style.height;
  var pagePaddingTop = ((_page$style = page.style) === null || _page$style === void 0 ? void 0 : _page$style.paddingTop) || 0;
  var pagePaddingBottom = ((_page$style2 = page.style) === null || _page$style2 === void 0 ? void 0 : _page$style2.paddingBottom) || 0;
  return pageHeight - pagePaddingTop - pagePaddingBottom;
};

/**
 * Transform node percent height to fixed
 *
 * @param {Object} page
 * @param {Object} node
 * @returns {Object} transformed node
 */
var resolveNodePercentHeight = function resolveNodePercentHeight(page, node) {
  var _page$style3, _node$style;
  if (isNil((_page$style3 = page.style) === null || _page$style3 === void 0 ? void 0 : _page$style3.height)) return node;
  if (isNil((_node$style = node.style) === null || _node$style === void 0 ? void 0 : _node$style.height)) return node;
  var pageArea = getPageArea(page);
  var height = transformHeight(pageArea, node.style.height);
  var style = Object.assign({}, node.style, {
    height: height
  });
  return Object.assign({}, node, {
    style: style
  });
};

/**
 * Transform page immediate children with percent height to fixed
 *
 * @param {Object} page
 * @returns {Object} transformed page
 */
var resolvePagePercentHeight = function resolvePagePercentHeight(page) {
  if (!page.children) return page;
  var resolveChild = function resolveChild(child) {
    return resolveNodePercentHeight(page, child);
  };
  var children = page.children.map(resolveChild);
  return Object.assign({}, page, {
    children: children
  });
};

/**
 * Transform all page immediate children with percent height to fixed.
 * This is needed for computing correct dimensions on pre-pagination layout.
 *
 * @param {Object} root document root
 * @returns {Object} transformed document root
 */
var resolvePercentHeight = function resolvePercentHeight(root) {
  if (!root.children) return root;
  var children = root.children.map(resolvePagePercentHeight);
  return Object.assign({}, root, {
    children: children
  });
};

var isType = function isType(type) {
  return function (node) {
    return node.type === type;
  };
};
var isLink = isType(P.Link);
var isText = isType(P.Text);
var isTextInstance = isType(P.TextInstance);

/**
 * Checks if node has render prop
 *
 * @param {Object} node
 * @returns {boolean} has render prop?
 */
var hasRenderProp = function hasRenderProp(node) {
  var _node$props;
  return !!((_node$props = node.props) !== null && _node$props !== void 0 && _node$props.render);
};

/**
 * Checks if node is text type (Text or TextInstance)
 *
 * @param {Object} node
 * @returns {boolean} are all children text instances?
 */
var isTextType = function isTextType(node) {
  return isText(node) || isTextInstance(node);
};

/**
 * Checks if is tet link that needs to be wrapped in Text
 *
 * @param {Object} node
 * @returns {boolean} are all children text instances?
 */
var isTextLink = function isTextLink(node) {
  var children = node.children || [];

  // Text string inside a Link
  if (children.every(isTextInstance)) return true;

  // Text node inside a Link
  if (children.every(isText)) return false;
  return children.every(isTextType);
};

/**
 * Wraps node children inside Text node
 *
 * @param {Object} node
 * @returns {boolean} node with intermediate Text child
 */
var wrapText = function wrapText(node) {
  var textElement = {
    type: P.Text,
    props: {},
    style: {},
    box: {},
    children: node.children
  };
  return Object.assign({}, node, {
    children: [textElement]
  });
};
var transformLink = function transformLink(node) {
  if (!isLink(node)) return node;

  // If has render prop substitute the instance by a Text, that will
  // ultimately render the inline Link via the textkit PDF renderer.
  if (hasRenderProp(node)) return Object.assign({}, node, {
    type: P.Text
  });

  // If is a text link (either contains Text or TextInstalce), wrap it
  // inside a Text element so styles are applied correctly

  if (isTextLink(node)) return wrapText(node);
  return node;
};

/**
 * Transforms Link layout to correctly render text and dynamic rendered links
 *
 * @param {Object} node
 * @returns {Object} node with link substitution
 */
var resolveLinkSubstitution = function resolveLinkSubstitution(node) {
  if (!node.children) return node;
  var resolveChild = compose(transformLink, resolveLinkSubstitution);
  var children = node.children.map(resolveChild);
  return Object.assign({}, node, {
    children: children
  });
};

var layout = asyncCompose(resolveZIndex, resolveOrigin, resolveAssets, resolvePagination, resolveTextLayout, resolvePercentRadius, resolveDimensions, resolveSvg, resolveAssets, resolveInheritance, resolvePercentHeight, resolvePagesPaddings, resolveStyles, resolveLinkSubstitution, resolveBookmarks, resolvePageSizes, resolveYoga);

export { layout as default };

import React from 'react';
import { transform } from 'buble';
import {
  Page,
  Text,
  Link,
  Font,
  View,
  Canvas,
  Note,
  Image,
  G,
  Svg,
  Path,
  Rect,
  Line,
  Stop,
  Defs,
  Tspan,
  Circle,
  Ellipse,
  Polygon,
  Polyline,
  ClipPath,
  LinearGradient,
  RadialGradient,
  StyleSheet,
} from '@react-pdf/renderer';

const Document = 'DOCUMENT';

const primitives = {
  Document,
  Page,
  Text,
  Link,
  Font,
  View,
  Note,
  Image,
  Canvas,
  G,
  Svg,
  Path,
  Rect,
  Line,
  Stop,
  Defs,
  Tspan,
  Circle,
  Ellipse,
  Polygon,
  Polyline,
  ClipPath,
  LinearGradient,
  RadialGradient,
  StyleSheet,
};

const transpile = (
  jsx: string,
  data: Record<string, any>,
  callback: (doc: any) => void,
  onError: (err: Error) => void,
) => {
  try {
    const result = transform(jsx, {
      objectAssign: 'Object.assign',
      transforms: {
        dangerousForOf: true,
        dangerousTaggedTemplateString: true,
      },
    });

    const output = new Function(
      'React',
      'ReactPDF',
      'json',
      ...Object.keys(primitives),
      result.code,
    );

    output(
      React,
      { render: (doc) => callback(doc) },
      data,
      ...Object.values(primitives),
    );
    onError(null);
  } catch (e) {
    if (onError) {
      onError(e);
    }
  }
};

export default transpile;

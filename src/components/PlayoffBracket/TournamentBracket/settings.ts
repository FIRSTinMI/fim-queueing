export type RoundHeaderOptions = {
  height: number;
  marginBottom: number;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  fontFamily: string;
};

export type Options = {
  width: number;
  boxHeight: number;
  heightMultiplier: number;
  spaceBetweenColumns: number;
  connectorColor: string;
  connectorOffsetY: number;
  roundHeader: RoundHeaderOptions;
  roundSeparatorWidth: number;
};

export type ComputedOptions = Options & {
  columnWidth: number;
};

export const defaultStyle: Options = {
  width: 210,
  boxHeight: 100,
  heightMultiplier: 1.2,
  spaceBetweenColumns: 50,
  connectorColor: 'rgb(47, 54, 72)',
  connectorOffsetY: 12,
  roundSeparatorWidth: 20,
  roundHeader: {
    height: 40,
    marginBottom: 20,
    fontSize: 16,
    fontColor: 'white',
    backgroundColor: 'rgb(47, 54, 72)',
    fontFamily: '"Roboto", "Arial", "Helvetica", "sans-serif"',
  },
};

export const getCalculatedStyles = (style = defaultStyle): ComputedOptions => {
  const { width, spaceBetweenColumns } = style;
  const columnWidth = width + spaceBetweenColumns;
  return { ...style, columnWidth };
};

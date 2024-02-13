import { h, Fragment } from 'preact';

const pr = new Intl.PluralRules('en-US', { type: 'ordinal' });

export default function numberToOrdinal(num: number) {
  if (Number.isNaN(num)) return num;

  const suffixes = new Map([
    ['one', 'st'],
    ['two', 'nd'],
    ['few', 'rd'],
    ['other', 'th'],
  ]);
  const formatOrdinals = (n: number): JSX.Element => {
    const rule = pr.select(n);
    const suffix = suffixes.get(rule);
    return (<>{n}<sup>{suffix}</sup></>);
  };

  return formatOrdinals(num);
}

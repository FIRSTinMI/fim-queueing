declare module '*.css' {
  const mapping: Record<string, string>;
  export default mapping;
}

declare module '*.scss'

declare module '*.svg' {
  const content: string;
  export default content;
}

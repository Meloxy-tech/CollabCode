import { useEffect, useRef } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { yCollab } from 'y-codemirror.next';

const LANGUAGE_EXTENSIONS = {
  javascript: () => javascript(),
  python: () => python(),
  cpp: () => cpp(),
};

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
  },
  '.cm-content': {
    fontFamily: '"JetBrains Mono", monospace',
    padding: '16px 0',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--surface)',
    color: 'var(--text-dim)',
    border: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--accent)',
  },
  '.cm-scroller': {
    fontFamily: '"JetBrains Mono", monospace',
  },
});

export default function CodeEditor({ ytext, awareness, language }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !awareness) return;

    const langExt = (LANGUAGE_EXTENSIONS[language] || LANGUAGE_EXTENSIONS.javascript)();

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        langExt,
        editorTheme,
        yCollab(ytext, awareness),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });

    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytext, awareness, language]);

  return <div className="editor-container" ref={containerRef} />;
}

import * as vscode from "vscode";
import {
  SQLAutocomplete,
  SQLDialect,
  AutocompleteOptionType,
} from "sql-autocomplete";

class SQLCompletionItemProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<
    vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
  > {
    const startPos = new vscode.Position(0, 0);
    const textRange = new vscode.Range(startPos, position);
    const text = document.getText(textRange);

    const embeddedSqlRegex = /(\S+ *= *f?)([['|"]{3}|['|"])(.*?)--sql\s(.*?)/gs;
    const matches = [...text.matchAll(embeddedSqlRegex)];
    const lastMatch = matches[matches.length - 1];

    if (!lastMatch) {
      return null;
    }

    const openingToken = lastMatch[2];
    const startingChars =
      lastMatch.index +
      lastMatch[1].length +
      openingToken.length +
      lastMatch[3].length +
      6;
    const sqlString = text.slice(startingChars);

    if (sqlString.match(new RegExp(`(;|[^\]?${openingToken})`))) {
      return null;
    }

    const autoCompleter = new SQLAutocomplete(SQLDialect.PLpgSQL);
    const suggestions = autoCompleter.autocomplete(sqlString);
    const nonNullSuggestions = suggestions.filter(
      (item) => item.value !== null
    );

    const completionItems = nonNullSuggestions.map((item) => {
      const label: string =
        item.optionType === AutocompleteOptionType.KEYWORD
          ? item.value.toUpperCase()
          : item.value;
      let kind;

      switch (item.optionType) {
        case AutocompleteOptionType.KEYWORD:
          kind = vscode.CompletionItemKind.Keyword;
          break;

        case AutocompleteOptionType.TABLE:
          kind = vscode.CompletionItemKind.Value;
          break;

        case AutocompleteOptionType.COLUMN:
          kind = vscode.CompletionItemKind.Field;
          break;
      }
      return {
        label,
        kind,
      };
    });

    return {
      items: completionItems,
    };
  }
}

async function removeEmbeddings() {
  const eidtor = vscode.window.activeTextEditor;
  if (!eidtor) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  const document = eidtor.document;
  if (document.languageId !== "python") {
    vscode.window.showErrorMessage("Not a python file");
    return;
  }

  const pythonStrRegex = /(\S+ *= *f?)([['|"]{3}|['|"])(.*?)\2/gs;
  const docText = document.getText();

  const textWithoutEmbedding = docText.replace(
    pythonStrRegex,
    (match, g1, g2, g3) => {
      const embeddingRegex = /(--sql$|--sql\s)/;
      return g1 + g2 + g3.replace(embeddingRegex, "") + g2;
    }
  );

  eidtor.edit((editBuilder) => {
    const firstLine = document.lineAt(0);
    const lastLine = document.lineAt(document.lineCount - 1);

    const fullTextRange = new vscode.Range(
      firstLine.range.start,
      lastLine.range.end
    );

    editBuilder.replace(fullTextRange, textWithoutEmbedding);
  });
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "sql-expert" is now active!');

  // Switch on suggestions in strings for completionItemProvider to work
  const config = vscode.workspace.getConfiguration();
  config
    .update(
      "editor.quickSuggestions",
      { strings: "on" },
      vscode.ConfigurationTarget.Global
    )
    .then(null, (error) => {
      console.error(error);
      const msg =
        "Failed to update editor.quickSuggestions settings. If you want intelliSense to work manually set editor.quickSuggestions' string property to 'on'";
      vscode.window.showErrorMessage(msg);
    });

  const removeEmbeddingsDisposable = vscode.commands.registerCommand(
    "sql-expert.removeEmbeddings",
    removeEmbeddings
  );

  const completionProviderDisposable =
    vscode.languages.registerCompletionItemProvider(
      "python",
      new SQLCompletionItemProvider(),
      "."
    );

  context.subscriptions.push(removeEmbeddingsDisposable);
  context.subscriptions.push(completionProviderDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

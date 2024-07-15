import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "sql-expert" is now active!');

  const removeEmbeddings = vscode.commands.registerCommand(
    "sql-expert.removeEmbeddings",
    async () => {
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

      const textWithoutEmbedding = docText.replace(pythonStrRegex, (match, g1, g2, g3) => {
        const embeddingRegex = /(--sql$|--sql\s)/;
        return g1 + g2 + g3.replace(embeddingRegex, "") + g2;
      });

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
  );

  context.subscriptions.push(removeEmbeddings);
}

// This method is called when your extension is deactivated
export function deactivate() {}

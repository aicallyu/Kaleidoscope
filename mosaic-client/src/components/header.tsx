import * as React from "react";
import { Smartphone, HelpCircle, Settings, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [darkMode, setDarkMode] = React.useState(false);

  React.useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <header
      className={`bg-white border-b border-gray-200 sticky top-0 z-50 ${
        darkMode ? "dark:bg-gray-900 dark:border-gray-700" : ""
      }`}
    >
      <div className="flex items-center justify-between h-16 px-5">
        <div className="flex items-center space-x-3">
          <div
            className={`w-8 h-8 bg-primary rounded-lg flex items-center justify-center ${
              darkMode ? "dark:bg-gray-800" : ""
            }`}
          >
            <Smartphone className="text-white w-4 h-4" />
          </div>
          <h1
            className={`text-xl font-semibold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Kaleidoscope
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            data-testid="button-help"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            aria-label="Toggle dark mode"
            onClick={() => setDarkMode((prev) => !prev)}
            data-testid="button-darkmode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

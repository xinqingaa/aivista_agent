export function Footer() {
  return (
    <footer className="border-t">
      <div className=" w-full max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-between gap-4 py-6 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2024 AiVista. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

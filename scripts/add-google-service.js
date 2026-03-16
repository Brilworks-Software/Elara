#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Path to the Xcode project
const pbxprojPath = path.join(
  __dirname,
  "../ios/Elara.xcodeproj/project.pbxproj",
);
const googleServicePath = "GoogleService-Info.plist";

// Read the project file
let pbxproj = fs.readFileSync(pbxprojPath, "utf8");

// Check if GoogleService-Info.plist is already in the project
if (pbxproj.includes("GoogleService-Info.plist")) {
  console.log("GoogleService-Info.plist is already added to the Xcode project");
  process.exit(0);
}

// Generate unique IDs for file reference and build file
const fileRefId = generateId();
const buildFileId = generateId();

// Find the main group (Elara folder)
const mainGroupMatch = pbxproj.match(
  /\/\* Elara \*\/ = \{[^}]+children = \([^)]+\);/s,
);
if (!mainGroupMatch) {
  console.error("Could not find main group in project.pbxproj");
  process.exit(1);
}

const mainGroupSection = mainGroupMatch[0];
const childrenMatch = mainGroupSection.match(/children = \(([^)]+)\);/);
if (!childrenMatch) {
  console.error("Could not find children section");
  process.exit(1);
}

// Add file reference to main group children
const newChildren =
  childrenMatch[1] + `\n\t\t\t\t${fileRefId} /* GoogleService-Info.plist */,`;
pbxproj = pbxproj.replace(childrenMatch[1], newChildren);

// Add PBXFileReference section entry
const fileReferenceSection = `\t\t${fileRefId} /* GoogleService-Info.plist */ = {isa = PBXFileReference; fileEncoding = 4; lastKnownFileType = text.plist.xml; path = "GoogleService-Info.plist"; sourceTree = "<group>"; };`;

// Find the PBXFileReference section and add our entry
const fileReferenceSectionMatch = pbxproj.match(
  /\/\* Begin PBXFileReference section \*\/[\s\S]*?\/\* End PBXFileReference section \*\//,
);
if (fileReferenceSectionMatch) {
  const endOfSection = fileReferenceSectionMatch[0].lastIndexOf(
    "/* End PBXFileReference section */",
  );
  const beforeEnd = fileReferenceSectionMatch[0].substring(0, endOfSection);
  const afterEnd = fileReferenceSectionMatch[0].substring(endOfSection);
  const newSection = beforeEnd + fileReferenceSection + "\n" + afterEnd;
  pbxproj = pbxproj.replace(fileReferenceSectionMatch[0], newSection);
}

// Add PBXBuildFile section entry
const buildFileSection = `\t\t${buildFileId} /* GoogleService-Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefId} /* GoogleService-Info.plist */; };`;

// Find the PBXBuildFile section and add our entry
const buildFileSectionMatch = pbxproj.match(
  /\/\* Begin PBXBuildFile section \*\/[\s\S]*?\/\* End PBXBuildFile section \*\//,
);
if (buildFileSectionMatch) {
  const endOfSection = buildFileSectionMatch[0].lastIndexOf(
    "/* End PBXBuildFile section */",
  );
  const beforeEnd = buildFileSectionMatch[0].substring(0, endOfSection);
  const afterEnd = buildFileSectionMatch[0].substring(endOfSection);
  const newSection = beforeEnd + buildFileSection + "\n" + afterEnd;
  pbxproj = pbxproj.replace(buildFileSectionMatch[0], newSection);
}

// Add to Resources build phase
const resourcesBuildPhaseMatch = pbxproj.match(
  /\/\* Resources \*\/ = \{[^}]+files = \([^)]+\);/s,
);
if (resourcesBuildPhaseMatch) {
  const filesMatch = resourcesBuildPhaseMatch[0].match(/files = \(([^)]+)\);/);
  if (filesMatch) {
    const newFiles =
      filesMatch[1] +
      `\n\t\t\t\t${buildFileId} /* GoogleService-Info.plist in Resources */,`;
    pbxproj = pbxproj.replace(filesMatch[1], newFiles);
  }
}

// Write back to file
fs.writeFileSync(pbxprojPath, pbxproj, "utf8");
console.log("✅ Successfully added GoogleService-Info.plist to Xcode project");

function generateId() {
  const chars = "0123456789ABCDEF";
  let id = "";
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

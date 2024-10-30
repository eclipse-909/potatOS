#!/bin/bash

#Just a couple of functions I find convenient

# Compile TypeScript and open the OS in Vivaldi or your default browser.
run() {
	tsc
	start ./index.html || xdg-open ./index.html || open ./index.html
}

# ex) push main "commit message"
push() {
	branches=(main)
	if [ -z "$1" ]; then
		echo "Error: Github branch name is required. Branches include:"
		echo "${branches[@]}"
		return
	fi

	found=false
	for b in "${branches[@]}"; do
		if [ "$b" == "$1" ]; then
			found=true
		fi
	done

	if [ "$found" == false ]; then
		echo "Error: Unknown branch name provided. Branches include:"
		echo "${branches[@]}"
		return
	fi

	if [ -z "$2" ]; then
		echo "Error: Commit message is required"
		return
	fi

	git add .
	git commit -m "$2"
	git push origin main:"$1"
}

.PHONY: all clean lint

auntietuna-unsigned.xpi: src/*
	7z a -tzip -xr\!_* -xr\!.* $@ ./src/* ./LICENSE

all: %.xpi

clean:
	$(RM) auntietuna-*.xpi

lint:
	web-ext lint --ignore-files "**/_*" --source-dir=./src --self-hosted

# vim: set noexpandtab ts=2 sw=2 tw=72:
